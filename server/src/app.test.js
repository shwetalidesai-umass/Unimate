const request = require('supertest');

jest.mock('./services/googleAuth', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock('./db/pool', () => ({
  query: jest.fn(),
}));

const { verifyGoogleIdToken } = require('./services/googleAuth');
const pool = require('./db/pool');

// Ensure config/env has required values during tests.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id.apps.googleusercontent.com';
process.env.ALLOWED_EMAIL_DOMAINS = 'umass.edu,amherst.edu,hampshire.edu,mtholyoke.edu,smith.edu,gmail.com';

const { signAccessToken } = require('./services/jwt');
const app = require('./app');
const authHeader = { Authorization: `Bearer ${signAccessToken({ sub: 'u-1', email: 'student@umass.edu' })}` };

describe('API', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('GET /api/health responds with success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Server is running',
    });
  });

  it('POST /api/auth/google returns JWT + user for allowed email domain', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      email: 'student@umass.edu',
      name: 'Test Student',
    });
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'student@umass.edu',
          display_name: 'Test Student',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app).post('/api/auth/google').send({ credential: 'fake-google-id-token' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('student@umass.edu');
  });

  it('POST /api/auth/google accepts allowed subdomain email', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      email: 'student@dept.umass.edu',
      name: 'Subdomain Student',
    });
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'student@dept.umass.edu',
          display_name: 'Subdomain Student',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app).post('/api/auth/google').send({ credential: 'fake-google-id-token' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/auth/google accepts gmail when configured as allowed', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      email: 'student@gmail.com',
      name: 'Gmail Student',
    });
    pool.query.mockResolvedValue({
      rows: [
        {
          id: '00000000-0000-0000-0000-000000000003',
          email: 'student@gmail.com',
          display_name: 'Gmail Student',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app).post('/api/auth/google').send({ credential: 'fake-google-id-token' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('student@gmail.com');
  });

  it('POST /api/auth/google rejects unauthorized email domain', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      email: 'student@yahoo.com',
      name: 'Test Student',
    });

    const res = await request(app).post('/api/auth/google').send({ credential: 'fake-google-id-token' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('unauthorized_domain');
    expect(res.body.debug.domain).toBe('yahoo.com');
  });

  it('GET /api/auth/me rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/profile/me returns profile with auth', async () => {
    pool.query.mockResolvedValue({
      rows: [{
        id: 'u-1',
        email: 'student@umass.edu',
        display_name: 'Test Student',
        school: 'umass',
        class_year: '2027',
        major: 'Computer Science',
        availability: 'Weeknights',
      }],
    });
    const res = await request(app).get('/api/profile/me').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.email).toBe('student@umass.edu');
  });

  it('PATCH /api/profile/me updates profile', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: 'u-1', email: 'student@umass.edu', display_name: 'Updated Name' }],
    });
    const res = await request(app)
      .patch('/api/profile/me')
      .set(authHeader)
      .send({ displayName: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/collab/posts creates a new post', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'c-1', code: 'CS520' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'p-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'p-1', author_id: 'u-1', course_id: 'c-1', course_code: 'CS520', title: 'Need partner',
          tag: 'Project', max_members: 4, group_formed: false, formed_at: null, chat_link: null, member_count: 1,
        }],
      });
    const res = await request(app)
      .post('/api/collab/posts')
      .set(authHeader)
      .send({ courseCode: 'CS520', title: 'Need partner', tag: 'Project', maxMembers: 4 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.post.id).toBe('p-1');
  });

  it('POST /api/discussions/questions creates question', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'c-1', code: 'CS520' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', body: 'How to prep?', votes: 0 }] });
    const res = await request(app)
      .post('/api/discussions/questions')
      .set(authHeader)
      .send({ courseCode: 'CS520', body: 'How to prep?' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.question.id).toBe('q-1');
  });

  it('POST /api/reviews returns 409 on duplicate review', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'c-1' }] })
      .mockRejectedValueOnce({ code: '23505' });
    const res = await request(app)
      .post('/api/reviews')
      .set(authHeader)
      .send({ type: 'course', target: 'CS520', rating: 4, body: 'Good class' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/search returns grouped results', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'p-1', title: 'Need partner' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', body: 'Question body' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'r-1', body: 'Review body' }] });
    const res = await request(app).get('/api/search?q=partner').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results.posts)).toBe(true);
  });
});

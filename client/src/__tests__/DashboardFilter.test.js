import '@testing-library/jest-dom';

const POSTS = [
  { id: 1, course: 'CS 520', title: 'Looking for project partner', members: 2, max: 4, tag: 'Project' },
  { id: 2, course: 'MATH 235', title: 'Linear algebra study group', members: 1, max: 3, tag: 'Study' },
  { id: 3, course: 'ECON 310', title: 'Problem set help needed', members: 3, max: 4, tag: 'Homework' },
  { id: 4, course: 'CS 311', title: 'Algorithms final prep', members: 2, max: 5, tag: 'Exam' },
  { id: 5, course: 'STATS 240', title: 'Data analysis project team', members: 1, max: 4, tag: 'Project' },
  { id: 6, course: 'CS 445', title: 'Machine learning study group', members: 2, max: 3, tag: 'Study' },
];

function filterPosts(posts, tagFilter, search) {
  return posts.filter(p => {
    const matchTag = tagFilter === 'All' || p.tag === tagFilter;
    const matchSearch = p.course.toLowerCase().includes(search.trim().toLowerCase()) ||
                        p.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchTag && matchSearch;
  });
}

describe('Dashboard filtering logic', () => {
  test('returns all posts when filter is All and search is empty', () => {
    const result = filterPosts(POSTS, 'All', '');
    expect(result).toHaveLength(6);
  });

  test('filters by tag correctly', () => {
    const result = filterPosts(POSTS, 'Project', '');
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.tag).toBe('Project'));
  });

  test('filters by Exam tag correctly', () => {
    const result = filterPosts(POSTS, 'Exam', '');
    expect(result).toHaveLength(1);
    expect(result[0].course).toBe('CS 311');
  });

  test('filters by Homework tag correctly', () => {
    const result = filterPosts(POSTS, 'Homework', '');
    expect(result).toHaveLength(1);
    expect(result[0].course).toBe('ECON 310');
  });

  test('filters by search term in course name', () => {
    const result = filterPosts(POSTS, 'All', 'CS');
    expect(result).toHaveLength(3);
  });

  test('filters by partial course name', () => {
    const result = filterPosts(POSTS, 'All', '52');
    expect(result).toHaveLength(1);
    expect(result[0].course).toBe('CS 520');
  });

  test('returns empty when no match', () => {
    const result = filterPosts(POSTS, 'All', 'PHYS 999');
    expect(result).toHaveLength(0);
  });

  test('whitespace search returns all posts', () => {
    const result = filterPosts(POSTS, 'All', '   ');
    expect(result).toHaveLength(6);
  });
  
  test('combines tag and search filter', () => {
    const result = filterPosts(POSTS, 'Study', 'CS');
    expect(result).toHaveLength(1);
    expect(result[0].course).toBe('CS 445');
  });

});
import { Router } from 'express';
import authRoutes       from './auth.js';
import profileRoutes    from './profile.js';
import collabRoutes     from './collab.js';
import discussionRoutes from './discussions.js';
import reviewRoutes     from './reviews.js';
import searchRoutes     from './search.js';
import dashboardRoutes  from './dashboard.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth',        authRoutes);
router.use('/profile',     profileRoutes);
router.use('/collab',      collabRoutes);
router.use('/discussions', discussionRoutes);
router.use('/reviews',     reviewRoutes);
router.use('/search',      searchRoutes);
router.use('/dashboard',   dashboardRoutes);

export default router;
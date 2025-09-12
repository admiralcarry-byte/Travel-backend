const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// GET /api/activity-logs - Get recent activity logs
const getActivityLogs = async (req, res) => {
  try {
    const { 
      limit = 20, 
      entityType = null, 
      userId = null,
      page = 1 
    } = req.query;

    const query = {};
    
    // Filter by entity type if provided
    if (entityType) {
      query['action.entity'] = entityType;
    }
    
    // Filter by user if provided
    if (userId) {
      query['user.id'] = userId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const activities = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user.id', 'username email')
      .lean();

    const totalCount = await ActivityLog.countDocuments(query);

    // Format the response to match frontend expectations
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      user: activity.user.username || 'Unknown User',
      action: activity.action.description,
      timestamp: new Date(activity.timestamp),
      type: activity.action.entity,
      entityId: activity.action.entityId,
      metadata: activity.metadata
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

// GET /api/activity-logs/recent - Get recent activities for dashboard
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const activities = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('user.id', 'username email')
      .lean();

    // Format the response to match frontend expectations
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      user: activity.user.username || 'Unknown User',
      action: activity.action.description,
      timestamp: new Date(activity.timestamp),
      type: activity.action.entity,
      entityId: activity.action.entityId
    }));

    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

// POST /api/activity-logs - Create a new activity log entry
const createActivityLog = async (req, res) => {
  try {
    const {
      userId,
      actionType,
      description,
      entity,
      entityId,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!userId || !actionType || !description || !entity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, actionType, description, entity'
      });
    }

    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create activity log entry
    const activityLog = new ActivityLog({
      user: {
        id: userId,
        username: user.username,
        email: user.email
      },
      action: {
        type: actionType,
        description,
        entity,
        entityId: entityId || null
      },
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        ...metadata
      }
    });

    await activityLog.save();

    res.status(201).json({
      success: true,
      data: activityLog,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity log',
      error: error.message
    });
  }
};

// GET /api/activity-logs/stats - Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 1d, 7d, 30d, 90d
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get total activities in period
    const totalActivities = await ActivityLog.countDocuments({
      timestamp: { $gte: startDate }
    });

    // Get activities by entity type
    const activitiesByEntity = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action.entity',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get activities by action type
    const activitiesByAction = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action.type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get most active users
    const mostActiveUsers = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$user.id',
          username: { $first: '$user.username' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalActivities,
        activitiesByEntity,
        activitiesByAction,
        mostActiveUsers
      }
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message
    });
  }
};

// DELETE /api/activity-logs/:id - Delete an activity log entry (admin only)
const deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;

    const activityLog = await ActivityLog.findByIdAndDelete(id);
    
    if (!activityLog) {
      return res.status(404).json({
        success: false,
        message: 'Activity log not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity log',
      error: error.message
    });
  }
};

module.exports = {
  getActivityLogs,
  getRecentActivities,
  createActivityLog,
  getActivityStats,
  deleteActivityLog
};
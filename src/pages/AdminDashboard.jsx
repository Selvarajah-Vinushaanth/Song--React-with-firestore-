import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  where,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement 
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { 
  Users, 
  Key, 
  CreditCard, 
  Activity, 
  TrendingUp, 
  Database,
  Calendar,
  DollarSign,
  BarChart3,
  RefreshCw,
  Download,
  Shield,
  AlertTriangle,
  Bell,
  Settings,
  Search,
  Filter,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Zap,
  Clock,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Star,
  Award,
  Target,
  Layers,
  BarChart2,
  PieChart,
  LineChart,
  Crown
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    cpu: 45,
    memory: 68,
    storage: 23,
    uptime: '99.9%',
    activeConnections: 245
  });
  const [dashboardData, setDashboardData] = useState({
    users: [],
    apiKeys: [],
    apiRequests: [],
    payments: [],
    usageLogs: []
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalApiKeys: 0,
    totalRequests: 0,
    totalRevenue: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    errorRate: 0,
    successRate: 0,
    topService: '',
    dailyActiveUsers: 0,
    monthlyGrowth: 0,
    churnRate: 0
  });
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 3m

  // Check if user is admin (you can customize this logic)
  useEffect(() => {
    if (currentUser) {
      // Add your admin email addresses here or check admin role in Firestore
      const adminEmails = [
        'admin@yourdomain.com', 
        'your-admin-email@gmail.com',
        'selvarajahvinushaanth@gmail.com' // Add your actual admin email here
      ];
      
      // More flexible admin check - also allow if email contains "admin" or if it's a specific domain
      const isAdmin = adminEmails.includes(currentUser.email) || 
                     currentUser.email?.includes('admin') ||
                     currentUser.email?.endsWith('@yourdomain.com'); // Replace with your domain
      
      console.log('Checking admin access for:', currentUser.email, 'Is Admin:', isAdmin);
      setAuthorized(isAdmin);
      
      if (isAdmin) {
        setupRealtimeListeners();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [currentUser, timeRange]);

  // Export data function
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => {
        if (value && typeof value === 'object' && value.toDate) {
          return value.toDate().toISOString();
        }
        return typeof value === 'string' ? `"${value}"` : value;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setupRealtimeListeners();
    return () => {
      // Cleanup listeners when component unmounts
    };
  }, [timeRange]);

  const setupRealtimeListeners = () => {
    setLoading(true);
    
    // Set up real-time listeners for each collection (simplified to avoid index issues)
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDashboardData(prev => ({ ...prev, users }));
      updateStats({ ...dashboardData, users });
    });

    const unsubscribeApiKeys = onSnapshot(collection(db, 'apiKeys'), (snapshot) => {
      const apiKeys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by createdAt
      apiKeys.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      setDashboardData(prev => ({ ...prev, apiKeys }));
      updateStats({ ...dashboardData, apiKeys });
    });

    const unsubscribeApiRequests = onSnapshot(collection(db, 'apiRequests'), (snapshot) => {
      const apiRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by timestamp
      apiRequests.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      });
      setDashboardData(prev => ({ ...prev, apiRequests: apiRequests.slice(0, 1000) }));
      updateStats({ ...dashboardData, apiRequests });
    });

    const unsubscribePayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by createdAt or timestamp
      payments.sort((a, b) => {
        const aTime = a.createdAt || a.timestamp;
        const bTime = b.createdAt || b.timestamp;
        if (!aTime || !bTime) return 0;
        return bTime.toDate() - aTime.toDate();
      });
      setDashboardData(prev => ({ ...prev, payments }));
      updateStats({ ...dashboardData, payments });
    });

    const unsubscribeUsageLogs = onSnapshot(collection(db, 'usage_logs'), (snapshot) => {
      const usageLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by timestamp
      usageLogs.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      });
      setDashboardData(prev => ({ ...prev, usageLogs: usageLogs.slice(0, 1000) }));
      updateStats({ ...dashboardData, usageLogs });
      setLoading(false);
    });

    // Return cleanup function
    return () => {
      unsubscribeUsers();
      unsubscribeApiKeys();
      unsubscribeApiRequests();
      unsubscribePayments();
      unsubscribeUsageLogs();
    };
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [users, apiKeys, apiRequests, payments, usageLogs] = await Promise.all([
        fetchUsers(),
        fetchApiKeys(),
        fetchApiRequests(),
        fetchPayments(),
        fetchUsageLogs()
      ]);

      setDashboardData({
        users,
        apiKeys,
        apiRequests,
        payments,
        usageLogs
      });

      calculateStats({
        users,
        apiKeys,
        apiRequests,
        payments,
        usageLogs
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const updateStats = (data) => {
    if (data.users && data.apiKeys && data.apiRequests && data.payments) {
      calculateStats(data);
    }
  };

  const fetchUsers = async () => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const fetchApiKeys = async () => {
    const apiKeysRef = collection(db, 'apiKeys');
    const snapshot = await getDocs(query(apiKeysRef, orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const fetchApiRequests = async () => {
    try {
      const apiRequestsRef = collection(db, 'apiRequests');
      // Simplified query to avoid index issues
      const snapshot = await getDocs(apiRequestsRef);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by timestamp in memory if timestamp exists
      requests.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      });
      
      return requests.slice(0, 1000); // Limit to 1000 most recent
    } catch (error) {
      console.error('Error fetching API requests:', error);
      return [];
    }
  };

  const fetchPayments = async () => {
    try {
      const paymentsRef = collection(db, 'payments');
      // Simplified query to avoid index issues
      const snapshot = await getDocs(paymentsRef);
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt or timestamp in memory
      payments.sort((a, b) => {
        const aTime = a.createdAt || a.timestamp;
        const bTime = b.createdAt || b.timestamp;
        if (!aTime || !bTime) return 0;
        return bTime.toDate() - aTime.toDate();
      });
      
      return payments;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  };

  const fetchUsageLogs = async () => {
    try {
      const usageLogsRef = collection(db, 'usage_logs');
      // Simplified query to avoid index issues
      const snapshot = await getDocs(usageLogsRef);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by timestamp in memory
      logs.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.toDate() - a.timestamp.toDate();
      });
      
      return logs.slice(0, 1000); // Limit to 1000 most recent
    } catch (error) {
      console.error('Error fetching usage logs:', error);
      return [];
    }
  };

  const calculateStats = (data) => {
    try {
      const now = new Date();
      const timeRangeMs = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '3m': 90 * 24 * 60 * 60 * 1000
      };
      const cutoffTime = new Date(now.getTime() - timeRangeMs[timeRange]);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Total users
      const totalUsers = data.users?.length || 0;

      // Active users (users who have API keys or recent activity)
      const activeUsers = data.users?.filter(user => 
        data.apiKeys?.some(key => key.userId === user.id) ||
        data.apiRequests?.some(req => req.userId === user.id && 
          req.timestamp && req.timestamp.toDate() > cutoffTime)
      ).length || 0;

      // Daily active users
      const dailyActiveUsers = data.users?.filter(user => 
        data.apiRequests?.some(req => req.userId === user.id && 
          req.timestamp && req.timestamp.toDate() > yesterday)
      ).length || 0;

      // Total API keys
      const totalApiKeys = data.apiKeys?.length || 0;

      // Total requests in time range
      const recentRequests = data.apiRequests?.filter(req => {
        try {
          return req.timestamp && req.timestamp.toDate() > cutoffTime;
        } catch (error) {
          return false;
        }
      }) || [];

      const totalRequests = recentRequests.length;

      // Success and error rates
      const successfulRequests = recentRequests.filter(req => req.status === 'success').length;
      const successRate = totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0;
      const errorRate = totalRequests > 0 ? (((totalRequests - successfulRequests) / totalRequests) * 100).toFixed(1) : 0;

      // Average response time (simulated)
      const avgResponseTime = Math.round(Math.random() * 500 + 200); // 200-700ms

      // Top service
      const serviceCounts = {};
      recentRequests.forEach(req => {
        const service = req.service || req.endpoint || 'unknown';
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });
      const topService = Object.keys(serviceCounts).reduce((a, b) => 
        serviceCounts[a] > serviceCounts[b] ? a : b, 'N/A');

      // Total revenue with proper formatting
      const totalRevenue = data.payments?.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0) || 0;

      // Monthly growth (simulated based on user creation dates)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const thisMonthUsers = data.users?.filter(user => {
        const userCreatedAt = user.createdAt || user.profile?.createdAt;
        if (!userCreatedAt) return false;
        try {
          const date = userCreatedAt.toDate ? userCreatedAt.toDate() : new Date(userCreatedAt);
          return date >= thisMonth;
        } catch (error) {
          return false;
        }
      }).length || 0;

      const lastMonthUsers = data.users?.filter(user => {
        const userCreatedAt = user.createdAt || user.profile?.createdAt;
        if (!userCreatedAt) return false;
        try {
          const date = userCreatedAt.toDate ? userCreatedAt.toDate() : new Date(userCreatedAt);
          return date >= lastMonth && date < thisMonth;
        } catch (error) {
          return false;
        }
      }).length || 0;

      const monthlyGrowth = lastMonthUsers > 0 ? 
        (((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100) : 
        (thisMonthUsers > 0 ? 100 : 0);

      // Churn rate (simplified calculation)
      const churnRate = Math.max(0, Math.random() * 5); // 0-5% simulated

      setStats({
        totalUsers,
        totalApiKeys,
        totalRequests,
        totalRevenue,
        activeUsers,
        dailyActiveUsers,
        avgResponseTime,
        errorRate: parseFloat(errorRate),
        successRate: parseFloat(successRate),
        topService,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
        churnRate: parseFloat(churnRate.toFixed(1))
      });

      // Generate notifications based on stats
      generateNotifications({
        totalUsers,
        errorRate: parseFloat(errorRate),
        successRate: parseFloat(successRate),
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
        avgResponseTime,
        totalRevenue
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
      // Set default stats if calculation fails
      setStats({
        totalUsers: 0,
        totalApiKeys: 0,
        totalRequests: 0,
        totalRevenue: 0,
        activeUsers: 0,
        dailyActiveUsers: 0,
        avgResponseTime: 0,
        errorRate: 0,
        successRate: 0,
        topService: 'N/A',
        monthlyGrowth: 0,
        churnRate: 0
      });
    }
  };

  const generateNotifications = (currentStats) => {
    const newNotifications = [];
    
    if (currentStats.errorRate > 5) {
      newNotifications.push({
        id: 'high-error-rate',
        type: 'error',
        title: 'High Error Rate Alert',
        message: `Error rate is ${currentStats.errorRate.toFixed(1)}% - exceeds threshold of 5%`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    if (currentStats.avgResponseTime > 1000) {
      newNotifications.push({
        id: 'slow-response',
        type: 'warning',
        title: 'Slow Response Time',
        message: `Average response time is ${currentStats.avgResponseTime.toLocaleString()}ms`,
        timestamp: new Date(),
        priority: 'medium'
      });
    }

    if (currentStats.monthlyGrowth > 20) {
      newNotifications.push({
        id: 'high-growth',
        type: 'success',
        title: 'High Growth Rate',
        message: `Monthly growth rate is ${currentStats.monthlyGrowth.toFixed(1)}%`,
        timestamp: new Date(),
        priority: 'low'
      });
    }

    if (currentStats.totalUsers > 100) {
      newNotifications.push({
        id: 'milestone',
        type: 'info',
        title: 'User Milestone',
        message: `Congratulations! You now have ${currentStats.totalUsers.toLocaleString()} users`,
        timestamp: new Date(),
        priority: 'low'
      });
    }

    if (currentStats.totalRevenue > 1000) {
      newNotifications.push({
        id: 'revenue-milestone',
        type: 'success',
        title: 'Revenue Milestone',
        message: `Total revenue reached $${currentStats.totalRevenue.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`,
        timestamp: new Date(),
        priority: 'low'
      });
    }

    setNotifications(newNotifications);
  };

  const getRequestsChartData = (range = "7d") => {
  try {
    const requestsByPeriod = {};
    const now = new Date();

    // Determine start date based on range
    let startDate = new Date();
    if (range === "7d") {
      startDate.setDate(now.getDate() - 6);
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 29);
    } else if (range === "3m") {
      startDate.setMonth(now.getMonth() - 2); // last 3 months including current month
    }

    // Count requests
    if (dashboardData.apiRequests) {
      dashboardData.apiRequests.forEach(request => {
        try {
          const reqDate = request.timestamp?.toDate ? request.timestamp.toDate() : new Date(request.timestamp);
          if (!reqDate || reqDate < startDate) return;

          let key;
          if (range === "7d" || range === "30d") {
            key = reqDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          } else {
            key = reqDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          }

          requestsByPeriod[key] = (requestsByPeriod[key] || 0) + 1;
        } catch (error) {
          console.warn("Could not parse request timestamp:", request.timestamp);
        }
      });
    }

    // Sort keys
    const sortedKeys = Object.keys(requestsByPeriod).sort((a, b) => new Date(a) - new Date(b));

    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "API Requests",
          data: sortedKeys.map(k => requestsByPeriod[k]),
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
          fill: true
        }
      ]
    };
  } catch (error) {
    console.error("Error generating requests chart data:", error);
    return { labels: [], datasets: [] };
  }
};


 const getUsersChartData = (range = "3m") => {
  const usersByPeriod = {};
  const now = new Date();

  dashboardData.users.forEach(user => {
    const userCreatedAt = user.createdAt || user.profile?.createdAt || user.subscription?.startDate;

    if (userCreatedAt) {
      try {
        const date = userCreatedAt.toDate ? userCreatedAt.toDate() : new Date(userCreatedAt);

        // --- filter by range ---
        let include = true;
        if (range === "7d") {
          include = date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === "30d") {
          include = date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        } else if (range === "3m") {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          include = date >= threeMonthsAgo;
        }

        if (!include) return;

        // --- group by day or month ---
        let key;
        if (range === "7d" || range === "30d") {
          key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } else {
          key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }

        usersByPeriod[key] = (usersByPeriod[key] || 0) + 1;
      } catch (error) {
        console.warn("Could not parse user creation date:", userCreatedAt);
      }
    }
  });

  const sortedKeys = Object.keys(usersByPeriod).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return {
    labels: sortedKeys,
    datasets: [
      {
        label: "New Users",
        data: sortedKeys.map(k => usersByPeriod[k]),
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2
      }
    ]
  };
};


  const getServiceUsageData = () => {
    try {
      const serviceCounts = {};
      const serviceColors = {
  'metaphor-classifier': 'rgba(139, 92, 246, 0.8)',  // purple
  'lyric-generator': 'rgba(59, 130, 246, 0.8)',      // blue
  'metaphor-creator': 'rgba(236, 72, 153, 0.8)',     // pink
  'masking-predict': 'rgba(34, 197, 94, 0.8)',       // green
  'chat': 'rgba(245, 158, 11, 0.8)',                 // amber
  'new-service-1': 'rgba(239, 68, 68, 0.8)',         // red
  'new-service-2': 'rgba(20, 184, 166, 0.8)',        // teal
  'new-service-3': 'rgba(168, 85, 247, 0.8)',        // violet
  'default': 'rgba(156, 163, 175, 0.8)'              // gray
};


      if (dashboardData.apiRequests && dashboardData.apiRequests.length > 0) {
        dashboardData.apiRequests.forEach(request => {
          const service = request.service || request.endpoint || 'unknown';
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
      }

      const labels = Object.keys(serviceCounts);
      const data = Object.values(serviceCounts);
      const backgroundColor = labels.map(service => serviceColors[service] || serviceColors.default);

      return {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: backgroundColor.length > 0 ? backgroundColor : [serviceColors.default],
          borderColor: backgroundColor.map(color => color.replace('0.8', '1')),
          borderWidth: 2
        }]
      };
    } catch (error) {
      console.error('Error generating service usage data:', error);
      return {
        labels: ['Error'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(239, 68, 68, 0.8)'],
          borderColor: ['rgba(239, 68, 68, 1)'],
          borderWidth: 2
        }]
      };
    }
  };

  const getHourlyRequestsData = () => {
    try {
      const hourlyData = Array(24).fill(0);
      
      if (dashboardData.apiRequests) {
        dashboardData.apiRequests.forEach(request => {
          try {
            if (request.timestamp) {
              const hour = request.timestamp.toDate().getHours();
              hourlyData[hour]++;
            }
          } catch (error) {
            console.warn('Could not parse request timestamp:', request.timestamp);
          }
        });
      }

      return {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Requests per Hour',
          data: hourlyData,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      };
    } catch (error) {
      console.error('Error generating hourly requests data:', error);
      return {
        labels: [],
        datasets: []
      };
    }
  };

const getRevenueTrendData = (range = "3m") => {
  try {
    const revenue = {};
    const now = new Date();

    if (dashboardData.payments) {
      dashboardData.payments.forEach(payment => {
        try {
          const date = payment.createdAt
            ? payment.createdAt.toDate()
            : payment.timestamp
            ? payment.timestamp.toDate()
            : new Date();

          // --- filter based on range ---
          let include = true;
          if (range === "7d") {
            include = date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          } else if (range === "30d") {
            include = date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          } else if (range === "3m") {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            include = date >= threeMonthsAgo;
          }

          if (!include) return;

          // --- group based on range ---
          let key;
          if (range === "7d" || range === "30d") {
            key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          } else {
            key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          }

          revenue[key] = (revenue[key] || 0) + (payment.amount || 0);
        } catch (error) {
          console.warn("Could not parse payment date:", payment);
        }
      });
    }

    // --- sort keys by actual date ---
    const sortedKeys = Object.keys(revenue).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "Revenue ($)",
          data: sortedKeys.map(k => revenue[k]),
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(34, 197, 94, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6
        }
      ]
    };
  } catch (error) {
    console.error("Error generating revenue trend data:", error);
    return { labels: [], datasets: [] };
  }
};


const getTokenUsageData = (range = '7d') => {
  try {
    const dailyTokens = {};
    const now = new Date();

    // Count tokens used per day from usage logs
    if (dashboardData.usageLogs) {
      dashboardData.usageLogs.forEach(log => {
        try {
          if (log.timestamp) {
            const logDate = log.timestamp.toDate();
            const dateStr = logDate.toISOString().split('T')[0];

            // Apply filtering based on range
            let include = true;
            if (range === '7d') {
  include = logDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
} else if (range === '30d') {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  include = logDate >= monthAgo;
} else if (range === '3m') {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  include = logDate >= threeMonthsAgo;
}


            if (include) {
              dailyTokens[dateStr] = (dailyTokens[dateStr] || 0) + (log.tokensCost || 1);
            }
          }
        } catch (error) {
          console.warn('Could not parse usage log timestamp:', log.timestamp);
        }
      });
    }

    // Sort dates
    const sortedDates = Object.keys(dailyTokens).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    const labels = sortedDates.map(date =>
      new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    const tokenData = sortedDates.map(date => dailyTokens[date]);

    return {
      labels,
      datasets: [{
        label: 'Tokens Used',
        data: tokenData,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    };
  } catch (error) {
    console.error('Error generating token usage data:', error);
    return {
      labels: [],
      datasets: []
    };
  }
};

// Payment Plan Distribution Data
const getPaymentPlanData = (range = '7d') => {
  try {
    const planCounts = {
      'Free': 0,
      'Basic': 0,
      'Pro': 0,
      'Enterprise': 0
    };
    const now = new Date();

    // Helper function to check if date is within range
    const isInRange = (dateValue) => {
      if (!dateValue) return false;
      
      let date;
      if (dateValue.toDate) {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }

      if (range === '7d') {
        return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === '30d') {
        return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (range === '3m') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return date >= threeMonthsAgo;
      }
      return true; // 'all' or any other range
    };

    // Count plans from payments made within the time range
    if (dashboardData.payments && dashboardData.payments.length > 0) {
      dashboardData.payments.forEach(payment => {
        // Check if payment was made within the time range
        if (payment.timestamp && isInRange(payment.timestamp)) {
          const planId = payment.planId || payment.plan || 'free';
          let planName;
          
          // Normalize plan name
          switch(planId.toLowerCase()) {
            case 'free':
              planName = 'Free';
              break;
            case 'basic':
              planName = 'Basic';
              break;
            case 'pro':
              planName = 'Pro';
              break;
            case 'enterprise':
              planName = 'Enterprise';
              break;
            default:
              planName = 'Free';
          }
          
          if (planCounts.hasOwnProperty(planName)) {
            planCounts[planName]++;
          }
        }
      });
    }

    // If no payments in range, show current user distribution
    const totalPayments = Object.values(planCounts).reduce((sum, count) => sum + count, 0);
    if (totalPayments === 0 && dashboardData.users) {
      // Show current user plan distribution
      dashboardData.users.forEach(user => {
        // Try to get plan from user subscription data
        const userPlan = user.subscription?.planId || 
                         user.subscription?.plan || 
                         user.planId || 
                         user.plan || 
                         'free';
        
        let planName;
        switch(userPlan.toLowerCase()) {
          case 'free':
            planName = 'Free';
            break;
          case 'basic':
            planName = 'Basic';
            break;
          case 'pro':
            planName = 'Pro';
            break;
          case 'enterprise':
            planName = 'Enterprise';
            break;
          default:
            planName = 'Free';
        }
        
        planCounts[planName]++;
      });
    }

    // Filter out plans with 0 users and prepare chart data
    const labels = [];
    const data = [];
    const backgroundColor = [];
    const borderColor = [];
    
    const colorMap = {
      'Free': 'rgba(156, 163, 175, 0.8)',
      'Basic': 'rgba(59, 130, 246, 0.8)',
      'Pro': 'rgba(16, 185, 129, 0.8)',
      'Enterprise': 'rgba(139, 92, 246, 0.8)'
    };

    Object.entries(planCounts).forEach(([plan, count]) => {
      if (count > 0) {
        labels.push(plan);
        data.push(count);
        backgroundColor.push(colorMap[plan]);
        borderColor.push(colorMap[plan].replace('0.8', '1'));
      }
    });

    // If no data, show default
    if (labels.length === 0) {
      labels.push('No Data');
      data.push(1);
      backgroundColor.push('rgba(156, 163, 175, 0.5)');
      borderColor.push('rgba(156, 163, 175, 1)');
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor,
        borderWidth: 2,
        hoverBackgroundColor: backgroundColor.map(color => color.replace('0.8', '0.9')),
        hoverBorderWidth: 3
      }]
    };
  } catch (error) {
    console.error('Error generating payment plan data:', error);
    return {
      labels: ['Error'],
      datasets: [{
        data: [1],
        backgroundColor: ['rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgba(239, 68, 68, 1)'],
        borderWidth: 2
      }]
    };
  }
};


  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, percentage }) => (
    <div className="group relative bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6 hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] transition-all duration-500 overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`}></div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white truncate">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-3 lg:p-4 rounded-xl bg-gradient-to-r ${color} bg-opacity-20 flex-shrink-0 ml-3`}>
          <Icon className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
        </div>
      </div>
      
      {trend && percentage !== undefined && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {percentage > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-400 mr-1 flex-shrink-0" />
            ) : percentage < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-400 mr-1 flex-shrink-0" />
            ) : (
              <div className="h-4 w-4 mr-1"></div>
            )}
            <span className={`text-sm font-medium ${
              percentage > 0 ? 'text-green-400' : 
              percentage < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {percentage !== 0 ? `${Math.abs(percentage).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <span className="text-xs text-gray-500 truncate">{trend}</span>
        </div>
      )}
    </div>
  );

  const TopUsersPanel = () => {
    // Calculate top users by API requests and token usage
    const getUserStats = () => {
      const userStats = {};
      
      // Count API requests per user
      if (dashboardData.apiRequests) {
        dashboardData.apiRequests.forEach(request => {
          if (request.userId) {
            if (!userStats[request.userId]) {
              userStats[request.userId] = {
                userId: request.userId,
                apiCalls: 0,
                tokensUsed: 0,
                lastActivity: null
              };
            }
            userStats[request.userId].apiCalls++;
            if (request.timestamp) {
              const requestDate = request.timestamp.toDate();
              if (!userStats[request.userId].lastActivity || requestDate > userStats[request.userId].lastActivity) {
                userStats[request.userId].lastActivity = requestDate;
              }
            }
          }
        });
      }

      // Add token usage from usage logs
      if (dashboardData.usageLogs) {
        dashboardData.usageLogs.forEach(log => {
          if (log.userId && userStats[log.userId]) {
            userStats[log.userId].tokensUsed += log.tokensCost || 1;
          }
        });
      }

      // Add user email information
      if (dashboardData.users) {
        dashboardData.users.forEach(user => {
          if (userStats[user.id]) {
            userStats[user.id].email = user.email || user.profile?.email || 'Unknown';
            userStats[user.id].subscription = user.subscription?.planId || 'free';
          }
        });
      }

      // Convert to array and sort by API calls
      return Object.values(userStats)
        .filter(user => user.apiCalls > 0)
        .sort((a, b) => b.apiCalls - a.apiCalls)
        .slice(0, 5); // Top 5 users
    };

    const topUsers = getUserStats();

    return (
      <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Crown className="h-6 w-6 mr-3 text-yellow-400" />
            Top Users
          </h3>
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            Top {topUsers.length}
          </span>
        </div>
        
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {topUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No user activity yet</p>
            </div>
          ) : (
            topUsers.map((user, index) => (
              <div
                key={user.userId}
                className="p-4 rounded-xl bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                      'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {user.email && user.email.length > 20 
                          ? user.email.substring(0, 20) + '...' 
                          : user.email}
                      </p>
                      <p className="text-gray-400 text-sm">
                        ID: {user.userId.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 font-semibold">{user.apiCalls}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">{user.tokensUsed}</span>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.subscription === 'pro' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      user.subscription === 'enterprise' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {user.subscription}
                    </span>
                  </div>
                </div>
                {user.lastActivity && (
                  <div className="mt-2 text-xs text-gray-500">
                    Last active: {user.lastActivity.toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const SystemHealthPanel = () => (
    <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Server className="h-6 w-6 mr-3 text-green-400" />
        System Health
      </h3>
      
      <div className="space-y-6">
        {[
          { label: 'CPU Usage', value: systemHealth.cpu, icon: Cpu, color: 'from-blue-500 to-blue-600' },
          { label: 'Memory', value: systemHealth.memory, icon: HardDrive, color: 'from-purple-500 to-purple-600' },
          { label: 'Storage', value: systemHealth.storage, icon: Database, color: 'from-green-500 to-green-600' }
        ].map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <metric.icon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-300 font-medium">{metric.label}</span>
              </div>
              <span className="text-white font-bold">{metric.value}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 bg-gradient-to-r ${metric.color} rounded-full transition-all duration-500`}
                style={{ width: `${metric.value}%` }}
              ></div>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
          <div className="text-center">
            <Wifi className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Uptime</p>
            <p className="text-white font-bold">{systemHealth.uptime}</p>
          </div>
          <div className="text-center">
            <Globe className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Connections</p>
            <p className="text-white font-bold">{systemHealth.activeConnections}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const RecentActivity = () => (
    <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Activity className="h-6 w-6 mr-3 text-orange-400" />
        Recent Activity
      </h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {dashboardData.apiRequests && dashboardData.apiRequests.length > 0 ? (
          dashboardData.apiRequests.slice(0, 10).map((request, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:bg-gray-700/50 transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  request.status === 'success' ? 'bg-green-400' : 
                  request.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                } animate-pulse`}></div>
                <div>
                  <p className="text-white font-medium">
                    {request.service || request.endpoint || 'Unknown Service'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    User: {request.userId ? request.userId.substring(0, 8) + '...' : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-sm">
                  {request.timestamp ? 
                    request.timestamp.toDate().toLocaleTimeString() : 
                    'Unknown time'
                  }
                </p>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  request.status === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : request.status === 'error'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {request.status || 'pending'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );

  const UsersTable = () => {
    const filteredUsers = dashboardData.users.filter(user => {
      const userEmail = user.email || user.profile?.email || '';
      const matchesSearch = userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'all') return matchesSearch;
      
      const userApiKeys = dashboardData.apiKeys.filter(key => key.userId === user.id);
      const isActive = userApiKeys.length > 0;
      
      return matchesSearch && (
        (filterStatus === 'active' && isActive) ||
        (filterStatus === 'inactive' && !isActive)
      );
    });

    return (
      <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Users className="h-6 w-6 mr-3 text-blue-400" />
            User Management
          </h3>
          
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">API Keys</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.slice(0, 10).map((user) => {
                const userApiKeys = dashboardData.apiKeys.filter(key => key.userId === user.id);
                const userEmail = user.email || user.profile?.email || 'No email';
                const userCreatedAt = user.createdAt || user.profile?.createdAt || user.subscription?.startDate;
                const userSubscription = user.subscription?.planId || 'free';
                const isActive = userApiKeys.length > 0;
                
                return (
                  <tr key={user.id} className="hover:bg-gray-700/30 transition-colors duration-200">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isActive ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'
                        }`}>
                          {userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <p className="text-white font-medium">{userEmail}</p>
                          <p className="text-gray-400 text-sm">ID: {user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">
                      {userCreatedAt ? 
                        (userCreatedAt.toDate ? userCreatedAt.toDate().toLocaleDateString() : 
                         new Date(userCreatedAt).toLocaleDateString()) : 
                        'Unknown'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30">
                        {userApiKeys.length}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        userSubscription === 'pro' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        userSubscription === 'enterprise' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {userSubscription}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No users found matching your criteria</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Showing {Math.min(filteredUsers.length, 10)} of {filteredUsers.length} users
          </p>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors duration-200">
              Previous
            </button>
            <button className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200">
              1
            </button>
            <button className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors duration-200">
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
          <p className="text-sm text-gray-500 mt-2">Current user: {currentUser?.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Background Decorative Elements */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>

      <div className="relative z-10 p-6">
        <div className="max-w-8xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                {/* Home Navigation */}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 rounded-xl text-gray-300 hover:text-white transition-all duration-200 backdrop-blur-sm group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Home</span>
                </Link>

                <div>
                  <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300 mb-2 tracking-tight">
                    Admin Dashboard
                  </h1>
                  <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mb-2"></div>
                  <p className="text-gray-300 text-lg">Monitor your application's performance and analytics</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, keys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800/50 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                  />
                </div>
                
                {/* Time Range Selector */}
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="3m">Last 3 months</option>
                </select>
                
                {/* Refresh Button */}
                <button 
                  onClick={fetchAllData}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 transform hover:scale-105 flex items-center backdrop-blur-sm"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh
                </button>
                
                {/* Export Dropdown */}
                <div className="relative">
                  <button 
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-medium hover:from-green-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 transform hover:scale-105 flex items-center backdrop-blur-sm"
                    onClick={() => {
                      const menu = document.getElementById('export-menu');
                      menu.classList.toggle('hidden');
                    }}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Export
                  </button>
                  <div id="export-menu" className="hidden absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl z-10 border border-gray-700">
                    <div className="py-2">
                      {[
                        { label: 'Export Users', action: () => exportToCSV(dashboardData.users, 'users') },
                        { label: 'Export API Keys', action: () => exportToCSV(dashboardData.apiKeys, 'api-keys') },
                        { label: 'Export Requests', action: () => exportToCSV(dashboardData.apiRequests, 'api-requests') },
                        { label: 'Export Payments', action: () => exportToCSV(dashboardData.payments, 'payments') }
                      ].map((item, index) => (
                        <button 
                          key={index}
                          onClick={item.action}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white w-full text-left rounded-lg mx-1 transition-colors duration-200"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-800/30 backdrop-blur-sm rounded-xl p-2 border border-gray-700/50">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'system', label: 'System', icon: Server }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  icon={Users}
                  color="from-blue-500 to-blue-600"
                  subtitle={`${stats.activeUsers.toLocaleString()} active`}
                  trend="vs last month"
                  percentage={stats.monthlyGrowth}
                />
                <StatCard
                  title="Daily Active"
                  value={stats.dailyActiveUsers.toLocaleString()}
                  icon={UserCheck}
                  color="from-green-500 to-green-600"
                  subtitle="users today"
                  trend="vs yesterday"
                  percentage={Math.round(Math.random() * 10 - 5)} // Simulated
                />
                <StatCard
                  title="API Keys"
                  value={stats.totalApiKeys.toLocaleString()}
                  icon={Key}
                  color="from-purple-500 to-purple-600"
                  subtitle="total generated"
                />
                <StatCard
                  title="API Requests"
                  value={stats.totalRequests.toLocaleString()}
                  icon={Activity}
                  color="from-yellow-500 to-orange-500"
                  subtitle={`Last ${timeRange}`}
                  trend="vs previous period"
                  percentage={Math.round(Math.random() * 20 - 10)} // Simulated
                />
                <StatCard
                  title="Success Rate"
                  value={`${100}%`}
                  icon={CheckCircle}
                  color="from-emerald-500 to-emerald-600"
                  subtitle={`${stats.errorRate.toFixed(1)}% errors`}
                  trend="error rate"
                  percentage={-Math.round(stats.errorRate)}
                />
                <StatCard
                  title="Revenue"
                  value={`$${stats.totalRevenue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}`}
                  icon={DollarSign}
                  color="from-pink-500 to-rose-600"
                  subtitle="total earned"
                  trend="vs last month"
                  percentage={Math.round(Math.random() * 15)} // Simulated
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* API Requests Trend */}
                <div className="xl:col-span-2 bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <LineChart className="h-6 w-6 mr-3 text-blue-400" />
                    API Requests Trend
                  </h3>
                  <div style={{ height: '300px', maxHeight: '300px' }}>
                    <Line
                      data={getRequestsChartData(timeRange)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            labels: { color: '#ffffff' },
                            position: 'top'
                          },
                        },
                        scales: {
                          x: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }
                          },
                          y: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }, 
                            beginAtZero: true 
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Top Users Panel */}
                <TopUsersPanel />
              </div>

              {/* Additional Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Service Usage */}
                <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <PieChart className="h-6 w-6 mr-3 text-purple-400" />
                    Service Usage
                  </h3>
                  <div style={{ height: '250px', maxHeight: '250px' }}>
                    <Pie
                      data={getServiceUsageData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            labels: { color: '#ffffff' },
                            position: 'bottom'
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Hourly Requests */}
                <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <Clock className="h-6 w-6 mr-3 text-green-400" />
                    Hourly Activity
                  </h3>
                  <div style={{ height: '250px', maxHeight: '250px' }}>
                    <Line
                      data={getHourlyRequestsData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            labels: { color: '#ffffff' },
                            position: 'top'
                          },
                        },
                        scales: {
                          x: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }
                          },
                          y: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }, 
                            beginAtZero: true 
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* System Health */}
                <SystemHealthPanel />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend */}
                <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <TrendingUp className="h-6 w-6 mr-3 text-emerald-400" />
                    Revenue Trend
                  </h3>
                  <div style={{ height: '300px', maxHeight: '300px' }}>
                    <Line
                      data={getRevenueTrendData(timeRange)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            labels: { color: '#ffffff' },
                            position: 'top'
                          },
                        },
                        scales: {
                          x: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }
                          },
                          y: { 
                            ticks: { color: '#9CA3AF' }, 
                            grid: { color: '#374151' }, 
                            beginAtZero: true 
                          },
                        },
                      }}
                    />
                  </div>
                </div>
           <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <Zap className="h-6 w-6 mr-3 text-blue-400" />
        Token Usage Trend
      </h3>

      {/* Range Selector */}
      <div className="flex gap-2 mb-4">
        {/* {[
          { label: "7 Days", value: "7d" },
          { label: "1 Month", value: "1m" },
          { label: "3 Months", value: "3m" },
          { label: "All", value: "all" }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition 
              ${timeRange === option.value 
                ? "bg-blue-500 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
          >
            {option.label}
          </button>
        ))} */}
      </div>

      {/* Chart */}
      <div style={{ height: "300px", maxHeight: "300px" }}>
        <Line
          data={getTokenUsageData(timeRange)}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                labels: { color: "#ffffff" },
                position: "top"
              },
            },
            scales: {
              x: { 
                ticks: { color: "#9CA3AF" }, 
                grid: { color: "#374151" }
              },
              y: { 
                ticks: { color: "#9CA3AF" }, 
                grid: { color: "#374151" }, 
                beginAtZero: true 
              },
            },
          }}
        />
      </div>
    </div>
                
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
              

              {/* User Growth Chart */}
              <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <BarChart2 className="h-6 w-6 mr-3 text-blue-400" />
                  User Growth Analysis
                </h3>
                <div style={{ height: '400px', maxHeight: '400px' }}>
                  <Bar
                    data={getUsersChartData(timeRange)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          labels: { color: '#ffffff' },
                          position: 'top'
                        },
                      },
                      scales: {
                        x: { 
                          ticks: { color: '#9CA3AF' }, 
                          grid: { color: '#374151' }
                        },
                        y: { 
                          ticks: { color: '#9CA3AF' }, 
                          grid: { color: '#374151' }, 
                          beginAtZero: true 
                        },
                      },
                    }}
                  />
                </div>
              </div>
              {/* Payment Plan Distribution */}
                <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <PieChart className="h-6 w-6 mr-3 text-purple-400" />
                    Payment Plan Distribution
                  </h3>
                  <div style={{ height: '300px', maxHeight: '300px' }}>
                    <Pie
                      data={getPaymentPlanData(timeRange)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            labels: { color: '#ffffff' },
                            position: 'bottom'
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed * 100) / total).toFixed(1);
                                return `${context.label}: ${context.parsed} users (${percentage}%)`;
                              }
                            }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
                </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <UsersTable />
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SystemHealthPanel />
                <RecentActivity />
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className="relative text-center py-16 text-gray-400 border-t border-gray-800/50 mt-auto backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10">
          <p className="mb-6 text-lg font-medium">
            <span className="text-white">Tamil AI Models</span> &copy; 2025 | Created by
            <span className="text-violet-400 font-semibold"> Group-23</span>
          </p>
          <div className="flex justify-center space-x-8 mt-8">
            {[
              {
                icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
                color: "hover:text-violet-400",
                label: "GitHub",
              },
              {
                icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84",
                color: "hover:text-emerald-400",
                label: "Twitter",
              },
              {
                icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                color: "hover:text-pink-400",
                label: "Instagram",
              },
            ].map((social, idx) => (
              <a
                key={idx}
                href="#"
                className={`group text-gray-500 ${social.color} transition-all duration-300 transform hover:scale-110`}
              >
                <span className="sr-only">{social.label}</span>
                <div className="relative">
                  <div className="absolute inset-0 bg-current opacity-20 rounded-full blur-lg scale-150 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d={social.icon} clipRule="evenodd" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;

import React, { useEffect, useState } from 'react';
import { db } from '../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalActivity, setTotalActivity] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // 1️⃣ Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 2️⃣ Feature collections
        const features = [
          { key: 'lyricHistory', label: 'Lyrics' },
          { key: 'metaphorHistory', label: 'Metaphors' },
          { key: 'maskingHistory', label: 'Masking' },
          { key: 'searchHistory', label: 'Classification' }
        ];

        // 3️⃣ Initialize activity map
        const activityMap = {};
        let total = 0;

        // Pre-fill map for all users
        usersList.forEach(u => {
          activityMap[u.id] = {
            Lyrics: 0,
            Metaphors: 0,
            Masking: 0,
            Classification: 0
          };
        });

        // 4️⃣ Fetch activity for each feature
        for (const feature of features) {
          const snap = await getDocs(collection(db, feature.key));
          snap.forEach(doc => {
            const data = doc.data();
            const userId = data.userId || data.uid;
            if (!userId) return;

            if (!activityMap[userId]) {
              activityMap[userId] = {
                Lyrics: 0,
                Metaphors: 0,
                Masking: 0,
                Classification: 0
              };
            }

            activityMap[userId][feature.label] =
              (activityMap[userId][feature.label] || 0) + 1;
            total++;
          });
        }

        setUsers(usersList);
        setActivity(activityMap);
        setTotalActivity(total);
        setLoading(false);

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Sort users by total activity
  const sortedUsers = [...users].sort((a, b) => {
    const aTotal = Object.values(activity[a.id] || {}).reduce((sum, v) => sum + v, 0);
    const bTotal = Object.values(activity[b.id] || {}).reduce((sum, v) => sum + v, 0);
    return bTotal - aTotal;
  });

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-600">Total Users</span>
          <span className="text-3xl font-bold text-blue-600 mt-2">{users.length}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-600">Total Activities</span>
          <span className="text-3xl font-bold text-purple-600 mt-2">{totalActivity}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-600">Most Active User</span>
          <span className="text-xl font-bold text-green-600 mt-2">
            {sortedUsers[0]?.displayName || sortedUsers[0]?.email || 'N/A'}
          </span>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Joined</th>
              <th className="px-4 py-2 border text-blue-600">Lyrics</th>
              <th className="px-4 py-2 border text-green-600">Metaphors</th>
              <th className="px-4 py-2 border text-yellow-600">Masking</th>
              <th className="px-4 py-2 border text-red-600">Classification</th>
              <th className="px-4 py-2 border">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map(user => {
              const userActivity = activity[user.id] || {};
              const total = Object.values(userActivity).reduce((sum, v) => sum + v, 0);

              return (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 border">{user.displayName || user.email || user.id}</td>
                  <td className="px-4 py-2 border">{user.email || 'N/A'}</td>
                  <td className="px-4 py-2 border">
                    {user.createdAt && user.createdAt.toDate
                      ? user.createdAt.toDate().toLocaleDateString()
                      : 'Unknown'}
                  </td>
                  <td className="px-4 py-2 border text-blue-600">{userActivity.Lyrics || 0}</td>
                  <td className="px-4 py-2 border text-green-600">{userActivity.Metaphors || 0}</td>
                  <td className="px-4 py-2 border text-yellow-600">{userActivity.Masking || 0}</td>
                  <td className="px-4 py-2 border text-red-600">{userActivity.Classification || 0}</td>
                  <td className="px-4 py-2 border font-bold">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// components/StatsView.jsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = ["#00C49F", "#FF8042"];

const StatsView = ({ fitnessData, completedWeeksCount, totalWeeks = 12 }) => {
  if (!fitnessData) return <p>Loading...</p>;

  const { weight, target_weight } = fitnessData;
  const currentWeight = parseFloat(weight);
  const goalWeight = parseFloat(target_weight);

  const totalChange = goalWeight - currentWeight;
  const weightChangePerWeek = totalChange / totalWeeks;

  const lineData = Array.from({ length: totalWeeks }, (_, i) => ({
    week: `Week ${i + 1}`,
    targetWeight: currentWeight + (i + 1) * weightChangePerWeek,
  }));

  const pieData = [
    { name: "Completed", value: completedWeeksCount },
    { name: "Remaining", value: totalWeeks - completedWeeksCount },
  ];

  return (
    <div className="stats-view" >
      <h2 style={{ textAlign: "center", color:"#c67aeff3"  }}>Your Overall Progress</h2>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              labelLine={false}
              dataKey="value"
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ marginTop: "2rem" , color:"#c67aeff3" }}>Projected Weight Progress</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis
              label={{ value: "kg", angle: -90, position: "insideLeft" }}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="targetWeight"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsView;


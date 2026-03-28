import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Rectangle,
} from "recharts";

function DashboardGraph(props) {
  const {
    totalNutritionCalorie,
    totalNutritionProtiens,
    totalNutritionFats,
    totalNutritionVitamins,
    totalNutritionSodium,
  } = props;

  const nutrition_data = [
    { name: "Calories", data_value: totalNutritionCalorie },
    { name: "Proteins", data_value: totalNutritionProtiens },
    { name: "Fats", data_value: totalNutritionFats },
    { name: "Vitamins", data_value: totalNutritionVitamins },
    { name: "Sodium", data_value: totalNutritionSodium },
  ];

  return (
    <div style={{ width: "100%", paddingTop: "20px" }}>
      {/* Title */}
      <h3 style={{
        textAlign: "center",
        color: "#005BBB",
        fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
        fontWeight: "800",
        marginBottom: "20px",
        marginTop: "0"
      }}>
        Daily Nutrition Summary
      </h3>

      <div style={{ width: "100%", height: "clamp(250px, 50vw, 360px)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={nutrition_data}
            layout="vertical"
            margin={{ top: 10, right: 24, left: 40, bottom: 10 }}
          >
            {/* Grid lines */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis
              type="number"
              axisLine={true}
              tickLine={true}
              stroke="#666"
            />

            <YAxis
              type="category"
              dataKey="name"
              axisLine={true}
              tickLine={true}
              stroke="#666"
            />

            <Tooltip />
            
            <Legend />

            <Bar
              dataKey="data_value"
              fill="#005BBB"
              barSize={18}
              radius={[0, 8, 8, 0]}
              activeBar={<Rectangle fill="#0047A3" stroke="#005BBB" />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DashboardGraph;
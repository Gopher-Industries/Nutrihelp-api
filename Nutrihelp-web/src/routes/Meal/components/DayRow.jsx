// src/routes/Meal/components/DayRow.jsx
import React from "react";

export default function DayRow({ dayPlan, ingredientsByRecipe }) {
  const meals = ["breakfast", "lunch", "dinner"];

  const getIngredientName = (ing) =>
    ing?.ingredient_name || ing?.name || ing?.ingredient || "Ingredient";

  const getIngredientQty = (ing) =>
    ing?.quantity ?? ing?.qty ?? ing?.amount ?? "";

  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        className="day-header"
        style={{
          fontSize: "clamp(1rem, 3.5vw, 1.25rem)",
          lineHeight: 1.3,
          marginTop: 20,
          color: "var(--text-heading)",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: 6,
          marginBottom: 12,
        }}
      >
        {dayPlan?.day || "Day"}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          width: "100%",
        }}
      >
        {meals.map((mealKey) => {
          const recipe = dayPlan?.[mealKey];
          const rId = recipe?.id;
          const ingList = rId ? ingredientsByRecipe?.[rId] || [] : [];

          return (
            <div
              key={mealKey}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                padding: 14,
                backgroundColor: "var(--card-background-secondary)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.05)",
                minWidth: 0,
              }}
            >
              <h3
                className="meal-header"
                style={{
                  margin: "4px 0 8px",
                  color: "var(--primary-color)",
                  textDecoration: "underline",
                  fontSize: "clamp(0.875rem, 3vw, 1rem)",
                  lineHeight: 1.3,
                  fontWeight: 700,
                }}
              >
                {mealKey.charAt(0).toUpperCase() + mealKey.slice(1)}
              </h3>

              <p style={{ 
                fontWeight: 700, 
                margin: "0 0 6px", 
                fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                color: "var(--text-primary)"
              }}>
                {recipe?.recipe_name || "N/A"}
              </p>

              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  color: "var(--text-secondary)",
                  margin: "0 0 10px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {recipe?.instructions || "No instructions"}
              </p>

              <p
                style={{
                  fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                  marginBottom: 6,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Ingredients:
              </p>

              {ingList.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "clamp(0.6875rem, 2vw, 0.8125rem)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 4,
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: 4,
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      >
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingList.map((ing, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            padding: 4,
                            borderBottom: "1px solid var(--border-color-light)",
                          }}
                        >
                          {getIngredientName(ing)}
                        </td>
                        <td
                          style={{
                            padding: 4,
                            borderBottom: "1px solid var(--border-color-light)",
                          }}
                        >
                          {getIngredientQty(ing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p
                  style={{
                    fontSize: "clamp(0.6875rem, 2vw, 0.75rem)",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No ingredients listed.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
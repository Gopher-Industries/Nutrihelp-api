from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# Mock Chatbot
@app.route('/ai-model/chatbot/chat', methods=['POST'])
def chatbot_chat():
    data = request.json
    query = data.get('query', '')
    return jsonify({
        "msg": f"I am a mock AI assistant. You said: '{query}'. The real AI service is missing, but I'm here to ensure the app doesn't crash!"
    })

@app.route('/ai-model/chatbot/add_urls', methods=['POST'])
def chatbot_add_urls():
    urls = request.args.get('urls', '')
    return jsonify({
        "message": "URLs processed (mock)",
        "added_urls": urls.split(',')
    })

# Mock Medical Report (Obesity/Diabetes Prediction)
@app.route('/ai-model/medical-report/retrieve', methods=['POST'])
def medical_report_retrieve():
    # Return dummy report
    return jsonify({
        "medical_report": {
            "bmi": 24.5,
            "obesity_prediction": {
                "obesity_level": "Normal_Weight",
                "confidence": "0.95"
            },
            "diabetes_prediction": {
                "diabetes": False,
                "confidence": "0.10"
            },
            "nutribot_recommendation": "Maintain your current healthy lifestyle with balanced diet and regular exercise.",
            "model_version": "mock-v1"
        }
    })

# Mock Health Plan Generation
@app.route('/ai-model/medical-report/plan/generate', methods=['POST'])
def medical_plan_generate():
    return jsonify({
        "suggestion": "Focus on cardio and balanced meals.",
        "weekly_plan": [
            {
                "week": 1,
                "target_calories_per_day": 2000,
                "focus": "Endurance",
                "workouts": ["30 min jogging", "15 min stretching"],
                "meal_notes": "Increase protein intake.",
                "reminders": ["Drink water"]
            },
            {
                "week": 2,
                "target_calories_per_day": 1900,
                "focus": "Strength",
                "workouts": ["Pushups", "Squats"],
                "meal_notes": "More vegetables.",
                "reminders": ["Sleep early"]
            }
        ],
        "progress_analysis": "You are on track."
    })

if __name__ == '__main__':
    print("Starting Mock AI Server on port 8000...")
    app.run(port=8000, host='0.0.0.0')

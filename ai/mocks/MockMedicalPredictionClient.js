/**
 * MockMedicalPredictionClient.js
 * 
 * Mock medical prediction client for development and testing.
 */

const MedicalPredictionAIClientInterface = require('../interfaces/MedicalPredictionAIClientInterface');

class MockMedicalPredictionClient extends MedicalPredictionAIClientInterface {
  constructor(config = {}) {
    super(config);
  }

  async predictRisk(request, options = {}) {
    const validation = this.validateRequest(request, ['healthData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 200));

    const mockPrediction = {
      riskLevel: 'medium',
      overallRiskScore: 0.58,
      recommendations: [
        'Increase physical activity',
        'Monitor dietary intake',
        'Regular health check-ups'
      ],
      timestamp: new Date().toISOString()
    };

    return this.successResponse(mockPrediction, {
      latencyMs: 200,
      metadata: {
        source: 'mock_medical_prediction',
        mockData: true
      }
    });
  }

  async predictObesity(request, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 150));

    const mockPrediction = {
      obesity_prediction: {
        obesity: false,
        obesity_level: 'Normal_Weight',
        probability: 0.85,
        bmi: 22.5
      },
      recommendations: [
        'Maintain current lifestyle',
        'Continue balanced diet'
      ]
    };

    return this.successResponse(mockPrediction, {
      latencyMs: 150,
      metadata: {
        source: 'mock_medical_prediction',
        model: 'obesity_classifier'
      }
    });
  }

  async predictDiabetes(request, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 150));

    const mockPrediction = {
      diabetes_prediction: {
        diabetes: false,
        probability: 0.92,
        risk_level: 'low'
      },
      recommendations: [
        'Maintain healthy diet',
        'Regular physical activity',
        'Limit sugar intake'
      ]
    };

    return this.successResponse(mockPrediction, {
      latencyMs: 150,
      metadata: {
        source: 'mock_medical_prediction',
        model: 'diabetes_classifier'
      }
    });
  }

  async generateReport(request, options = {}) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockReport = {
      reportId: `report_${Date.now()}`,
      userId: request.userId || 'mock_user',
      generatedAt: new Date().toISOString(),
      predictions: {
        obesity: {
          level: 'Normal_Weight',
          probability: 0.85
        },
        diabetes: {
          risk: 'low',
          probability: 0.92
        }
      },
      summary: 'Health metrics appear normal. Continue current regimen.'
    };

    return this.successResponse(mockReport, {
      latencyMs: 300,
      metadata: {
        source: 'mock_medical_prediction',
        mockData: true
      }
    });
  }

  async retrieveReport(request, options = {}) {
    const validation = this.validateRequest(request, ['userId']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const mockReport = {
      reportId: 'report_mock_12345',
      userId: request.userId,
      retrievedAt: new Date().toISOString(),
      msg: 'Mock medical report retrieved successfully',
      data: {
        obesity_prediction: { obesity: false },
        diabetes_prediction: { diabetes: false }
      }
    };

    return this.successResponse(mockReport, {
      latencyMs: 100,
      metadata: {
        source: 'mock_medical_prediction'
      }
    });
  }

  async isHealthy() {
    return true;
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      type: 'mock',
      healthy: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  MockMedicalPredictionClient
};

const axios = require('axios');

// Module Owner: Harsh Kanojia (Junior Cyber Security Lead)

/**
 * Service to handle HIBP interactions and medical breach filtering.
 */
class MedicalBreachService {
    constructor() {
        this.hibpBaseUrl = 'https://haveibeenpwned.com/api/v3';
        // NOTE: In a real scenario, this would come from process.env.HIBP_API_KEY
        // We will simulate a response if no key is present or for testing.
        this.apiKey = process.env.HIBP_API_KEY || 'mock_key';

        // Keywords to identify medically relevant breaches
        this.medicalKeywords = [
            'health', 'medical', 'hospital', 'clinic', 'patient',
            'doctor', 'pharmacy', 'insurance', 'lab', 'wellness',
            'fitness', 'nutrition', 'surgery', 'dental', 'medicare',
            'medicaid', 'nhs', 'pfizer', 'optus', 'medibank'
        ];
    }

    /**
     * Check for breaches and filter for medical relevance.
     * @param {string} email 
     * @returns {Promise<Array>} List of medically relevant breaches with risk assessment.
     */
    async checkBreach(email) {
        try {
            let breaches = [];

            // Simulation mode if no valid key or for testing specific scenarios
            if (this.apiKey === 'mock_key' || email.includes('test')) {
                breaches = this.getMockBreaches(email);
            } else {
                // Real API Call
                const response = await axios.get(`${this.hibpBaseUrl}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
                    headers: {
                        'hibp-api-key': this.apiKey,
                        'user-agent': 'Nutrihelp-Medical-Check'
                    }
                });
                breaches = response.data;
            }

            const medicalBreaches = this.filterMedicalBreaches(breaches);
            return medicalBreaches.map(breach => this.assessRisk(breach));

        } catch (error) {
            if (error.response && error.response.status === 404) {
                return []; // No breaches found
            }
            console.error('HIBP API Error:', error.message);
            throw new Error('Failed to validte breach status');
        }
    }

    /**
     * Filter breaches based on medical keywords in name, title, or description.
     */
    filterMedicalBreaches(breaches) {
        return breaches.filter(breach => {
            const text = `${breach.Name} ${breach.Title} ${breach.Description} ${breach.Domain}`.toLowerCase();

            // Check for explicit medical data classes
            const hasMedicalData = breach.DataClasses.some(dc =>
                dc.toLowerCase().includes('health') ||
                dc.toLowerCase().includes('medical') ||
                dc.toLowerCase().includes('insurance')
            );

            // Check for keywords
            const hasKeyword = this.medicalKeywords.some(keyword => text.includes(keyword));

            return hasMedicalData || hasKeyword;
        });
    }

    /**
     * Assign risk level based on exposed data classes.
     */
    assessRisk(breach) {
        let riskLevel = 'Low';
        const dataClasses = breach.DataClasses.map(dc => dc.toLowerCase());

        if (
            dataClasses.includes('medical records') ||
            dataClasses.includes('health diagnosis') ||
            dataClasses.includes('insurance information')
        ) {
            riskLevel = 'High';
        } else if (
            dataClasses.includes('passwords') ||
            dataClasses.includes('phone numbers') ||
            dataClasses.includes('physical addresses')
        ) {
            riskLevel = 'Medium';
        }

        return {
            name: breach.Name,
            title: breach.Title,
            domain: breach.Domain,
            breachDate: breach.BreachDate,
            description: breach.Description,
            dataClasses: breach.DataClasses,
            riskLevel,
            isVerified: breach.IsVerified
        };
    }

    getMockBreaches(email) {
        // Mock data for testing
        if (email === 'safe@example.com') return [];

        return [
            {
                Name: "MediBankMock",
                Title: "MediBank Mock Breach",
                Domain: "medibank.com.au",
                BreachDate: "2024-01-01",
                Description: "A mock breach of a health insurance provider exposing patient records.",
                DataClasses: ["Email addresses", "Medical ethics", "Health diagnosis", "Medical records"],
                IsVerified: true
            },
            {
                Name: "Twitter",
                Title: "Twitter",
                Domain: "twitter.com",
                BreachDate: "2023-01-01",
                Description: "Social media platform breach.",
                DataClasses: ["Email addresses"],
                IsVerified: true
            },
            {
                Name: "LocalClinic",
                Title: "Local Family Clinic",
                Domain: "localclinic.com",
                BreachDate: "2022-05-20",
                Description: "Exposure of appointment schedules.",
                DataClasses: ["Email addresses", "Names", "Phone numbers"],
                IsVerified: false
            }
        ];
    }
}

module.exports = new MedicalBreachService();

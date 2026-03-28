/** Appointment API service */
import BaseApi from './baseApi';

class AppointmentApi extends BaseApi {
    constructor() {
        super();
    }

    /**
     * Fetch all appointments with pagination and search
     * @param {Object} options - Query options
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Items per page (default: 10)
     * @param {string} options.search - Search query (default: "")
     * @returns {Promise<Object>} Paginated appointments response
     */
    async getAppointments({ page = 1, pageSize = 10, search = "" } = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(search && { search })
            });

            const response = await fetch(
                `${this.baseURL}/appointments/v2?${queryParams}`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }
    }

    /**
     * Create a new appointment
     * @param {Object} appointmentData - The appointment data
     * @returns {Promise<Object>} Created appointment response
     */
    async createAppointment(appointmentData) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${this.baseURL}/appointments/v2`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    userId,
                    ...appointmentData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.errors) {
                    // Handle validation errors from express-validator
                    const errorMessages = errorData.errors.map(e => e.msg).join(', ');
                    throw new Error(errorMessages);
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating appointment:', error);
            throw error;
        }
    }

    /**
     * Update an existing appointment
     * @param {string|number} appointmentId - The appointment ID
     * @param {Object} appointmentData - The updated appointment data
     * @returns {Promise<Object>} Updated appointment response
     */
    async updateAppointment(appointmentId, appointmentData) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${this.baseURL}/appointments/v2/${appointmentId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    userId,
                    ...appointmentData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.errors) {
                    const errorMessages = errorData.errors.map(e => e.msg).join(', ');
                    throw new Error(errorMessages);
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }
    }

    /**
     * Delete an appointment
     * @param {string|number} appointmentId - The appointment ID
     * @returns {Promise<Object>} Delete response
     */
    async deleteAppointment(appointmentId) {
        try {
            const response = await fetch(`${this.baseURL}/appointments/v2/${appointmentId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const appointmentApi = new AppointmentApi();
export default appointmentApi;

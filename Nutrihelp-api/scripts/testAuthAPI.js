// scripts/testAuthAPI.js
// API integration test script - testing the complete authentication process

const axios = require('axios');
require('dotenv').config();

const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class AuthAPITester {
    constructor(baseURL = 'http://localhost:80') {
        this.baseURL = baseURL;
        this.testData = {
            email: `test_${Date.now()}@nutrihelp.com`,
            password: 'TestPassword123!',
            name: 'Test User',
            first_name: 'Test',
            last_name: 'User'
        };
        this.tokens = {
            accessToken: null,
            refreshToken: null
        };
        this.testResults = {
            registration: false,
            login: false,
            tokenRefresh: false,
            protectedRoute: false,
            logout: false,
            errorHandling: false
        };
    }

    // Logging utility
    log = {
        info: (msg) => console.log(colors.blue('ℹ️'), msg),
        success: (msg) => console.log(colors.green('✅'), msg),
        error: (msg) => console.log(colors.red('❌'), msg),
        warn: (msg) => console.log(colors.yellow('⚠️'), msg),
        step: (msg) => console.log(colors.cyan('\n🔄'), colors.bold(msg))
    };

    // Test user registration
    async testRegistration() {
        this.log.step('Testing user registration...');
        
        try {
            const response = await axios.post(`${this.baseURL}/api/auth/register`, {
                ...this.testData
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 201 && response.data.success) {
                this.log.success('User registration successful');
                this.log.info(`User ID: ${response.data.user?.user_id || 'N/A'}`);
                this.testResults.registration = true;
                return true;
            } else {
                this.log.error('Registration response format is incorrect');
                console.log('Response data:', response.data);
                return false;
            }

        } catch (error) {
            this.log.error('User registration failed');
            this.handleError(error);
            return false;
        }
    }

    // Test user login
    async testLogin() {
        this.log.step('Testing user login...');
        
        try {
            const response = await axios.post(`${this.baseURL}/api/auth/login`, {
                email: this.testData.email,
                password: this.testData.password
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 200 && response.data.success) {
                const { accessToken, refreshToken } = response.data;
                
                if (accessToken && refreshToken) {
                    this.tokens.accessToken = accessToken;
                    this.tokens.refreshToken = refreshToken;

                    this.log.success('User login successful');
                    this.log.info(`Access Token: ${accessToken.substring(0, 20)}...`);
                    this.log.info(`Refresh Token: ${refreshToken.substring(0, 20)}...`);
                    this.testResults.login = true;
                    return true;
                } else {
                    this.log.error('Login response is missing required tokens');
                    return false;
                }
            } else {
                this.log.error('Login response format is incorrect');
                console.log('Response data:', response.data);
                return false;
            }

        } catch (error) {
            this.log.error('User login failed');
            this.handleError(error);
            return false;
        }
    }

    // Test access to protected route
    async testProtectedRoute() {
        this.log.step('Testing access to protected route...');

        if (!this.tokens.accessToken) {
            this.log.error('No access token available, skipping test');
            return false;
        }

        try {
            const response = await axios.get(`${this.baseURL}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.tokens.accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data.success) {
                this.log.success('Protected route access successful');
                this.log.info(`User information: ${response.data.user?.email || 'N/A'}`);
                this.testResults.protectedRoute = true;
                return true;
            } else {
                this.log.error('Protected route response format is incorrect');
                return false;
            }

        } catch (error) {
            this.log.error('Protected route access failed');
            this.handleError(error);
            return false;
        }
    }

    // Test token refresh
    async testTokenRefresh() {
        this.log.step('Testing token refresh...');

        if (!this.tokens.refreshToken) {
            this.log.error('No refresh token available, skipping test');
            return false;
        }

        try {
            const response = await axios.post(`${this.baseURL}/api/auth/refresh`, {
                refreshToken: this.tokens.refreshToken
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            if (response.status === 200 && response.data.success) {
                const { accessToken, refreshToken } = response.data;
                
                if (accessToken && refreshToken) {
                    // Update tokens
                    const oldAccessToken = this.tokens.accessToken;
                    this.tokens.accessToken = accessToken;
                    this.tokens.refreshToken = refreshToken;

                    this.log.success('Token refresh successful');
                    this.log.info('New access token obtained');

                    // Verify new token is different
                    if (oldAccessToken !== accessToken) {
                        this.log.success('New token is different from old token (correct)');
                    } else {
                        this.log.warn('New token is same as old token (potential issue)');
                    }
                    
                    this.testResults.tokenRefresh = true;
                    return true;
                } else {
                    this.log.error('Token refresh response is missing required tokens');
                    return false;
                }
            } else {
                this.log.error('Token refresh response format is incorrect');
                return false;
            }

        } catch (error) {
            this.log.error('Token refresh failed');
            this.handleError(error);
            return false;
        }
    }

    // Test error handling
    async testErrorHandling() {
        this.log.step('Testing error handling...');

        const errorTests = [
            {
                name: 'Invalid login credentials',
                test: () => axios.post(`${this.baseURL}/api/auth/login`, {
                    email: this.testData.email,
                    password: 'WrongPassword123!'
                })
            },
            {
                name: '无效refresh token',
                test: () => axios.post(`${this.baseURL}/api/auth/refresh`, {
                    refreshToken: 'invalid_refresh_token_123'
                })
            },
            {
                name: '无效access token',
                test: () => axios.get(`${this.baseURL}/api/auth/profile`, {
                    headers: { 'Authorization': 'Bearer invalid_access_token_123' }
                })
            }
        ];

        let passedTests = 0;

        for (const errorTest of errorTests) {
            try {
                await errorTest.test();
                this.log.warn(`${errorTest.name}: It should return an error but doesn't`);
            } catch (error) {
                if (error.response && error.response.status >= 400) {
                    this.log.success(`${errorTest.name}: Correctly returned error (${error.response.status})`);
                    passedTests++;
                } else {
                    this.log.error(`${errorTest.name}: Error handling exception`);
                    console.log('Error details:', error.message);
                }
            }
        }

        const allPassed = passedTests === errorTests.length;
        if (allPassed) {
            this.log.success('Error handling mechanism is working correctly');
            this.testResults.errorHandling = true;
        } else {
            this.log.error(`Error handling tests: ${passedTests}/${errorTests.length} passed`);
        }

        return allPassed;
    }

    // Test user logout
    async testLogout() {
        this.log.step('Testing user logout...');

        if (!this.tokens.refreshToken) {
            this.log.error('No refresh token available, skipping test');
            return false;
        }

        try {
            const response = await axios.post(`${this.baseURL}/api/auth/logout`, {
                refreshToken: this.tokens.refreshToken
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            if (response.status === 200 && response.data.success) {
                this.log.success('User logged out successfully');

                // Try to refresh with the old refresh token (should fail)
                try {
                    await axios.post(`${this.baseURL}/api/auth/refresh`, {
                        refreshToken: this.tokens.refreshToken
                    });
                    this.log.warn('Refresh token is still valid after logout (potential issue)');
                } catch (error) {
                    if (error.response && error.response.status >= 400) {
                        this.log.success('Refresh token is invalid after logout (correct)');
                        this.testResults.logout = true;
                        return true;
                    }
                }
            } else {
                this.log.error('Logout response format is incorrect');
                return false;
            }

        } catch (error) {
            this.log.error('User logout failed');
            this.handleError(error);
            return false;
        }

        return false;
    }

    // Server connection check
    async checkServerConnection() {
        this.log.step('Checking server connection...');

        try {
            const response = await axios.get(`${this.baseURL}/api-docs`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                this.log.success('Server connection is normal');
                return true;
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                this.log.error('Unable to connect to server');
                this.log.info('Please ensure the server is running at http://localhost:80');
                this.log.info('Run: npm start to start the server');
            } else {
                this.log.warn('Server connection check encountered an issue, but may still be available');
            }
            return false;
        }
    }

    // Error handling helper function
    handleError(error) {
        if (error.response) {
            this.log.info(`HTTP Status: ${error.response.status}`);
            this.log.info(`Error Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            this.log.info('Network request failed, no response');
        } else {
            this.log.info(`Request error: ${error.message}`);
        }
    }

    // Run full test
    async runFullTest() {
        console.log(colors.bold(colors.blue('\n🚀 Starting API integration tests')));
        console.log('='.repeat(60));

        // Check server connection
        const serverOK = await this.checkServerConnection();
        if (!serverOK) {
            this.log.error('Unable to connect to server, aborting tests');
            return false;
        }

        // Execute test sequence
        const tests = [
            { name: 'User Registration', method: this.testRegistration },
            { name: 'User Login', method: this.testLogin },
            { name: 'Protected Route', method: this.testProtectedRoute },
            { name: 'Token Refresh', method: this.testTokenRefresh },
            { name: 'Error Handling', method: this.testErrorHandling },
            { name: 'User Logout', method: this.testLogout }
        ];

        let passedTests = 0;
        const totalTests = tests.length;

        for (const test of tests) {
            try {
                const result = await test.method.call(this);
                if (result) passedTests++;

                // Test interval delay
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                this.log.error(`${test.name} test encountered an error: ${error.message}`);
            }
        }

        this.printTestSummary(passedTests, totalTests);
        return passedTests === totalTests;
    }

    // Print test summary
    printTestSummary(passedTests, totalTests) {
        console.log('\n' + '='.repeat(60));
        console.log(colors.bold(colors.blue('📊 Test Results Summary')));
        console.log('-'.repeat(60));

        Object.entries(this.testResults).forEach(([key, passed]) => {
            const testNames = {
                registration: 'User Registration',
                login: 'User Login',
                tokenRefresh: 'Token Refresh',
                protectedRoute: 'Protected Route',
                logout: 'User Logout',
                errorHandling: 'Error Handling'
            };
            
            const name = testNames[key] || key;
            const status = passed ? colors.green('✅ Passed') : colors.red('❌ Failed');
            console.log(`${name.padEnd(12)}: ${status}`);
        });

        console.log('-'.repeat(60));
        
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        const overallStatus = passedTests === totalTests
            ? colors.green('✅ All Passed')
            : colors.yellow(`⚠️ ${passedTests}/${totalTests} Passed (${successRate}%)`);

        console.log(`Test Results: ${overallStatus}`);
        console.log('='.repeat(60));

        if (passedTests === totalTests) {
            console.log(colors.bold(colors.green('\n🎉 Congratulations! All API tests passed!')));
            console.log(colors.green('Your authentication system is working correctly.'));
        } else {
            console.log(colors.bold(colors.yellow('\n⚠️ Some tests failed')));
            console.log(colors.yellow('Please check the failed test cases and fix the issues.'));
        }
    }

    // Quick test (only test basic functionality)
    async quickTest() {
        console.log(colors.bold(colors.blue('\n⚡ 快速API测试')));
        console.log('='.repeat(40));

        const serverOK = await this.checkServerConnection();
        if (!serverOK) return false;

        const basicTests = [
            { name: 'Registration', method: this.testRegistration },
            { name: 'Login', method: this.testLogin },
            { name: 'Protected Route', method: this.testProtectedRoute }
        ];

        let passed = 0;
        for (const test of basicTests) {
            const result = await test.method.call(this);
            if (result) passed++;
        }

        const allPassed = passed === basicTests.length;
        console.log(`\nQuick Test Results: ${passed}/${basicTests.length} Passed`);

        return allPassed;
    }
}

// If this script is run directly
if (require.main === module) {
    const tester = new AuthAPITester();

    // Process command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    switch (command) {
        case 'quick':
            tester.quickTest()
                .then(result => process.exit(result ? 0 : 1));
            break;

        case 'full':
        default:
            tester.runFullTest()
                .then(result => process.exit(result ? 0 : 1));
            break;
    }
}

module.exports = AuthAPITester;
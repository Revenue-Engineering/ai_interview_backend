const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test configuration
const testConfig = {
    authToken: 'test-token'
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${testConfig.authToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
        return error.response?.data || { error: error.message };
    }
}

// Test functions
async function testInvalidInterviewId() {
    console.log('\n=== Testing Invalid Interview ID Validation ===');

    const testCases = [
        { id: 'invalid', description: 'Non-numeric string' },
        { id: 'abc123', description: 'Alphanumeric string' },
        { id: '12.34', description: 'Decimal number' },
        { id: '', description: 'Empty string' },
        { id: 'undefined', description: 'Undefined string' },
        { id: 'null', description: 'Null string' }
    ];

    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.description} (ID: "${testCase.id}")`);

        const result = await makeRequest('GET', `/interviews/${testCase.id}/questions`);

        if (result.success === false && result.error === 'Invalid interview ID') {
            console.log('✅ Validation working correctly');
        } else {
            console.log('❌ Validation failed');
            console.log('Response:', result);
        }
    }
}

async function testValidInterviewId() {
    console.log('\n=== Testing Valid Interview ID ===');

    const result = await makeRequest('GET', '/interviews/1/questions');

    if (result.success === false && result.error === 'Authentication required') {
        console.log('✅ Valid ID accepted, authentication required (expected)');
    } else if (result.success === false && result.error === 'Invalid interview ID') {
        console.log('❌ Valid ID rejected incorrectly');
    } else {
        console.log('Response:', result);
    }
}

async function runTests() {
    console.log('🚀 Starting Validation Fix Test Suite');
    console.log('Make sure your server is running on http://localhost:8000');

    await testInvalidInterviewId();
    await testValidInterviewId();

    console.log('\n✅ Test suite completed');
}

// Run tests
runTests().catch(console.error); 
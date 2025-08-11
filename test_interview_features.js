const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test configuration
const testConfig = {
    // You'll need to replace these with actual values from your database
    applicationId: 1,
    interviewId: 1,
    dsaQuestionId: 1,
    userId: 1,
    authToken: 'your-auth-token-here'
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
        throw error;
    }
}

// Test functions
async function testCreateInterview() {
    console.log('\n=== Testing Interview Creation ===');

    const interviewData = {
        applicationId: testConfig.applicationId,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        mode: 'async',
        durationMinutes: 60,
        timezone: 'UTC',
        interviewType: 'coding',
        timeSlotStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeSlotEnd: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    };

    try {
        const result = await makeRequest('POST', '/interviews', interviewData);
        console.log('✅ Interview created successfully:', result.data.id);
        return result.data.id;
    } catch (error) {
        console.log('❌ Failed to create interview');
        return null;
    }
}

async function testGetInterviewQuestions(interviewId) {
    console.log('\n=== Testing Get Interview Questions ===');

    try {
        const result = await makeRequest('GET', `/interviews/${interviewId}/questions`);
        console.log('✅ Questions retrieved successfully');
        console.log('Current question index:', result.data.currentQuestionIndex);
        console.log('Total questions:', result.data.totalQuestions);
        console.log('First question:', result.data.questions[0]?.dsaQuestion?.name);
        return result.data;
    } catch (error) {
        console.log('❌ Failed to get interview questions');
        return null;
    }
}

async function testSubmitCode(interviewId, dsaQuestionId) {
    console.log('\n=== Testing Code Submission ===');

    const codeData = {
        dsaQuestionId: dsaQuestionId,
        interviewId: interviewId,
        userCode: `
function twoSum(nums, target) {
    const seen = new Set();
    for (let num of nums) {
        const complement = target - num;
        if (seen.has(complement)) {
            return true;
        }
        seen.add(num);
    }
    return false;
}

// Read input
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let lines = [];
rl.on('line', (line) => {
    lines.push(line);
});

rl.on('close', () => {
    const t = parseInt(lines[0]);
    let index = 1;
    
    for (let i = 0; i < t; i++) {
        const n = parseInt(lines[index++]);
        const nums = lines[index++].split(' ').map(Number);
        const target = parseInt(lines[index++]);
        
        console.log(twoSum(nums, target));
    }
});
    `,
        language: 'javascript'
    };

    try {
        const result = await makeRequest('POST', '/interviews/submit-code', codeData);
        console.log('✅ Code submitted successfully');
        console.log('Score:', result.data.score);
        console.log('Test cases passed:', result.data.testCasesPassed, '/', result.data.totalTestCases);
        console.log('Execution time:', result.data.executionTime, 'ms');
        console.log('Memory used:', result.data.memoryUsed, 'MB');
        return result.data;
    } catch (error) {
        console.log('❌ Failed to submit code');
        return null;
    }
}

async function testGetSubmissions(interviewId) {
    console.log('\n=== Testing Get Interview Submissions ===');

    try {
        const result = await makeRequest('GET', `/interviews/${interviewId}/submissions`);
        console.log('✅ Submissions retrieved successfully');
        console.log('Total submissions:', result.count);
        if (result.data.length > 0) {
            console.log('Latest submission score:', result.data[0].score);
        }
        return result.data;
    } catch (error) {
        console.log('❌ Failed to get submissions');
        return null;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Interview Features Test Suite');
    console.log('Make sure your server is running on http://localhost:3000');
    console.log('Make sure Judge0 is running on http://localhost:2358');
    console.log('Update testConfig with actual values from your database');

    try {
        // Test 1: Create interview (this will automatically assign questions)
        const interviewId = await testCreateInterview();
        if (!interviewId) {
            console.log('Skipping remaining tests due to interview creation failure');
            return;
        }

        // Test 2: Get interview questions
        const questionsData = await testGetInterviewQuestions(interviewId);
        if (!questionsData) {
            console.log('Skipping code submission test due to questions retrieval failure');
            return;
        }

        // Test 3: Submit code for the first question
        const firstQuestionId = questionsData.questions[0]?.dsaQuestion?.id;
        if (firstQuestionId) {
            await testSubmitCode(interviewId, firstQuestionId);
        }

        // Test 4: Get submissions
        await testGetSubmissions(interviewId);

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    testCreateInterview,
    testGetInterviewQuestions,
    testSubmitCode,
    testGetSubmissions,
    runTests
}; 
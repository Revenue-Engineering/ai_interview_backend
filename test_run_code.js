const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test data
const testData = {
    dsaQuestionId: 1, // Assuming you have a question with ID 1
    userCode: `function solution(input) {
    return input;
}`,
    language: 'javascript'
};

async function testRunCode() {
    try {
        console.log('Testing run-code endpoint...');

        const response = await axios.post(`${BASE_URL}/interviews/run-code`, testData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            }
        });

        console.log('✅ Run Code Response:', response.data);

        if (response.data.success) {
            console.log('✅ Code executed successfully!');
            console.log('Score:', response.data.data.score + '%');
            console.log('Test Cases Passed:', response.data.data.testCasesPassed + '/' + response.data.data.totalTestCases);
            console.log('Execution Time:', response.data.data.executionTime + 'ms');
            console.log('Memory Used:', response.data.data.memoryUsed + 'MB');
            console.log('Feedback:', response.data.data.feedback);

            if (response.data.data.output) {
                console.log('Output:', response.data.data.output);
            }

            if (response.data.data.error) {
                console.log('Error:', response.data.data.error);
            }

            // Show detailed test case results
            if (response.data.data.testCaseResults && response.data.data.testCaseResults.length > 0) {
                console.log('\n📋 Detailed Test Case Results:');
                response.data.data.testCaseResults.forEach(testCase => {
                    console.log(`\nTest Case ${testCase.testCaseNumber}:`);
                    console.log(`  Status: ${testCase.status} (${testCase.statusDescription})`);
                    console.log(`  Passed: ${testCase.passed ? '✅' : '❌'}`);
                    console.log(`  Input: ${testCase.input}`);
                    console.log(`  Expected Output: ${testCase.expectedOutput}`);
                    console.log(`  Actual Output: ${testCase.actualOutput}`);
                    if (testCase.executionTime) console.log(`  Execution Time: ${testCase.executionTime}ms`);
                    if (testCase.memoryUsed) console.log(`  Memory Used: ${testCase.memoryUsed}MB`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error testing run-code:', error.response?.data || error.message);
    }
}

async function testSubmitCode() {
    try {
        console.log('\nTesting submit-code endpoint...');

        const submitData = {
            ...testData,
            interviewId: 1 // Assuming you have an interview with ID 1
        };

        const response = await axios.post(`${BASE_URL}/interviews/submit-code`, submitData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            }
        });

        console.log('✅ Submit Code Response:', response.data);

        if (response.data.success) {
            console.log('✅ Code submitted successfully!');
            console.log('Submission ID:', response.data.data.id);
            console.log('Score:', response.data.data.score + '%');
        }

    } catch (error) {
        console.error('❌ Error testing submit-code:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Testing Interview Code Execution API\n');

    await testRunCode();
    await testSubmitCode();

    console.log('\n✨ Tests completed!');
}

runTests(); 
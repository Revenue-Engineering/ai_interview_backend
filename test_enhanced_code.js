const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test cases with different scenarios
const testCases = [
    {
        name: 'Correct JavaScript Solution',
        dsaQuestionId: 1,
        userCode: `function solution(input) {
    return input;
}`,
        language: 'javascript',
        expectedStatus: 'PASSED'
    },
    {
        name: 'Incorrect JavaScript Solution',
        dsaQuestionId: 1,
        userCode: `function solution(input) {
    return "wrong";
}`,
        language: 'javascript',
        expectedStatus: 'WRONG_ANSWER'
    },
    {
        name: 'JavaScript with Syntax Error',
        dsaQuestionId: 1,
        userCode: `function solution(input) {
    return input;
    // Missing closing brace
`,
        language: 'javascript',
        expectedStatus: 'COMPILATION_ERROR'
    },
    {
        name: 'Python Solution',
        dsaQuestionId: 1,
        userCode: `def solution(input):
    return input`,
        language: 'python',
        expectedStatus: 'PASSED'
    }
];

async function testEnhancedRunCode(testCase) {
    try {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        console.log('='.repeat(50));

        const response = await axios.post(`${BASE_URL}/interviews/run-code`, {
            dsaQuestionId: testCase.dsaQuestionId,
            userCode: testCase.userCode,
            language: testCase.language
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            }
        });

        if (response.data.success) {
            const data = response.data.data;
            console.log('✅ Code executed successfully!');
            console.log(`📊 Score: ${data.score}%`);
            console.log(`🎯 Test Cases: ${data.testCasesPassed}/${data.totalTestCases} passed`);
            console.log(`⏱️  Execution Time: ${data.executionTime}ms`);
            console.log(`💾 Memory Used: ${data.memoryUsed}MB`);

            // Show output and error
            if (data.output) {
                console.log(`📤 Output: "${data.output}"`);
            }

            if (data.error) {
                console.log(`❌ Error: "${data.error}"`);
            }

            // Show detailed test case results
            if (data.testCaseResults && data.testCaseResults.length > 0) {
                console.log('\n📋 Test Case Details:');
                data.testCaseResults.forEach((testCase, index) => {
                    const statusIcon = testCase.passed ? '✅' : '❌';
                    console.log(`\n  ${statusIcon} Test Case ${testCase.testCaseNumber}:`);
                    console.log(`    Status: ${testCase.status} (${testCase.statusDescription})`);
                    console.log(`    Input: "${testCase.input}"`);
                    console.log(`    Expected: "${testCase.expectedOutput}"`);
                    console.log(`    Actual: "${testCase.actualOutput}"`);

                    if (testCase.executionTime) {
                        console.log(`    Time: ${testCase.executionTime}ms`);
                    }
                    if (testCase.memoryUsed) {
                        console.log(`    Memory: ${testCase.memoryUsed}MB`);
                    }
                });
            }

            // Show feedback
            console.log('\n💬 Feedback:');
            console.log(data.feedback);

        } else {
            console.log('❌ Code execution failed:', response.data.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data?.message || error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Enhanced Code Execution Test Suite');
    console.log('='.repeat(60));

    for (const testCase of testCases) {
        await testEnhancedRunCode(testCase);
        console.log('\n' + '='.repeat(60));
    }

    console.log('\n✨ All tests completed!');
}

// Run the test suite
runAllTests(); 
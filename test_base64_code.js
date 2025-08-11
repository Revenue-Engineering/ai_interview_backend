const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test data with base64 encoded code
const testData = {
    dsaQuestionId: 1, // Assuming you have a question with ID 1
    userCode: btoa(unescape(encodeURIComponent(`function solution(input) {
    return input;
}`))),
    language: 'javascript'
};

async function testBase64RunCode() {
    try {
        console.log('🧪 Testing run-code endpoint with base64 encoded code...');
        console.log('='.repeat(60));

        console.log('📝 Original code:');
        console.log(`function solution(input) {
    return input;
}`);

        console.log('\n🔐 Base64 encoded code:');
        console.log(testData.userCode);

        const response = await axios.post(`${BASE_URL}/interviews/run-code`, testData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            }
        });

        console.log('\n✅ Run Code Response:', response.data);

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
        }

    } catch (error) {
        console.error('❌ Error testing base64 run-code:', error.response?.data || error.message);
    }
}

async function testBase64SubmitCode() {
    try {
        console.log('\n🧪 Testing submit-code endpoint with base64 encoded code...');
        console.log('='.repeat(60));

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

            // Check if the stored code is decoded
            console.log('\n📋 Stored code (should be decoded):');
            console.log(response.data.data.userCode);
        }

    } catch (error) {
        console.error('❌ Error testing base64 submit-code:', error.response?.data || error.message);
    }
}

async function testMixedEncoding() {
    try {
        console.log('\n🧪 Testing with non-base64 encoded code (backward compatibility)...');
        console.log('='.repeat(60));

        const plainTextData = {
            dsaQuestionId: 1,
            userCode: `function solution(input) {
    return input;
}`,
            language: 'javascript'
        };

        const response = await axios.post(`${BASE_URL}/interviews/run-code`, plainTextData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
            }
        });

        console.log('✅ Plain text code executed successfully!');
        console.log('Score:', response.data.data.score + '%');

    } catch (error) {
        console.error('❌ Error testing plain text code:', error.response?.data || error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Base64 Code Submission Tests\n');

    await testBase64RunCode();
    await testBase64SubmitCode();
    await testMixedEncoding();

    console.log('\n🎉 All tests completed!');
}

// Run the tests
runAllTests().catch(console.error);

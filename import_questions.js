const { PrismaClient } = require('@prisma/client');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importQuestionsFromCsv() {
    try {
        console.log('📥 Starting question import from CSV...');

        const csvPath = path.join(__dirname, 'dsa_questions.csv');

        if (!fs.existsSync(csvPath)) {
            console.error(`❌ CSV file not found at: ${csvPath}`);
            return;
        }

        console.log(`📁 Found CSV file at: ${csvPath}`);

        const results = [];
        const errors = [];
        let totalProcessed = 0;
        let successful = 0;

        // Read CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    results.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`📊 Found ${results.length} questions in CSV file`);

        // Process each row
        for (let i = 0; i < results.length; i++) {
            const row = results[i];
            totalProcessed++;

            try {
                // Parse the row data
                const questionData = {
                    name: row.Name,
                    level: row.Level,
                    problemStatement: row['Problem Statement'],
                    inputFormat: row['Input Format'],
                    constraints: row.Constraints,
                    inputExample: row['Input Example'],
                    outputFormat: row['Output Format'],
                    outputExample: row['Output Example'],
                    explanation: row.Explanation,
                    editorialAnswerInCpp: row['Editorial Answer in C++'],
                    testCase1Input: row['Test Case 1 Input'],
                    testCase1Output: row['Test Case 1 Output'],
                    testCase2Input: row['Test Case 2 Input'],
                    testCase2Output: row['Test Case 2 Output'],
                    testCase3Input: row['Test Case 3 Input'],
                    testCase3Output: row['Test Case 3 Output'],
                    topic: 'arrays', // Default topic
                    timeLimit: 30, // Default time limit
                    isActive: true,
                };

                // Validate required fields
                if (!questionData.name || !questionData.level || !questionData.problemStatement) {
                    throw new Error('Missing required fields: name, level, or problem statement');
                }

                // Create the question in database
                const question = await prisma.dsaQuestion.create({
                    data: questionData,
                });

                successful++;
                console.log(`✅ Imported: ${questionData.name} (${questionData.level})`);

            } catch (error) {
                const errorMsg = `Row ${i + 1}: ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ Error importing row ${i + 1}: ${error.message}`);
            }
        }

        console.log('\n📊 Import Summary:');
        console.log(`   - Total processed: ${totalProcessed}`);
        console.log(`   - Successful: ${successful}`);
        console.log(`   - Failed: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n❌ Import errors:');
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        if (successful > 0) {
            console.log('\n✅ Questions imported successfully!');

            // Verify the import
            const finalCount = await prisma.dsaQuestion.count({
                where: {
                    isActive: true,
                },
            });
            console.log(`📊 Final question count: ${finalCount}`);

            // Show questions by difficulty
            const easyCount = await prisma.dsaQuestion.count({
                where: { level: 'Easy', isActive: true },
            });
            const mediumCount = await prisma.dsaQuestion.count({
                where: { level: 'Medium', isActive: true },
            });
            const hardCount = await prisma.dsaQuestion.count({
                where: { level: 'Hard', isActive: true },
            });

            console.log(`📈 Questions by difficulty:`);
            console.log(`   - Easy: ${easyCount}`);
            console.log(`   - Medium: ${mediumCount}`);
            console.log(`   - Hard: ${hardCount}`);
        }

    } catch (error) {
        console.error('❌ Error during import:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the import
importQuestionsFromCsv(); 
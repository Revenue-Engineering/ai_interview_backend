const { PrismaClient } = require('@prisma/client');
const { DsaQuestionService } = require('./src/services/dsa-question.service');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const dsaQuestionService = new DsaQuestionService(prisma);

async function checkAndImportQuestions() {
    try {
        console.log('🔍 Checking current questions in database...');

        // Check total questions
        const totalQuestions = await prisma.dsaQuestion.count({
            where: {
                isActive: true,
            },
        });

        console.log(`📊 Total questions in database: ${totalQuestions}`);

        // Check questions by difficulty
        const mediumQuestions = await prisma.dsaQuestion.count({
            where: {
                level: 'Medium',
                isActive: true,
            },
        });

        const easyQuestions = await prisma.dsaQuestion.count({
            where: {
                level: 'Easy',
                isActive: true,
            },
        });

        const hardQuestions = await prisma.dsaQuestion.count({
            where: {
                level: 'Hard',
                isActive: true,
            },
        });

        console.log(`📈 Questions by difficulty:`);
        console.log(`   - Easy: ${easyQuestions}`);
        console.log(`   - Medium: ${mediumQuestions}`);
        console.log(`   - Hard: ${hardQuestions}`);

        if (totalQuestions < 2) {
            console.log('\n⚠️  Not enough questions found. Attempting to import from CSV...');

            const csvPath = path.join(__dirname, 'dsa_questions.csv');

            if (fs.existsSync(csvPath)) {
                console.log(`📁 Found CSV file at: ${csvPath}`);

                const result = await dsaQuestionService.bulkUploadFromCsv(csvPath);

                console.log('\n📥 Import Results:');
                console.log(`   - Total processed: ${result.totalProcessed}`);
                console.log(`   - Successful: ${result.successful}`);
                console.log(`   - Failed: ${result.failed}`);

                if (result.errors.length > 0) {
                    console.log('\n❌ Import errors:');
                    result.errors.forEach((error, index) => {
                        console.log(`   ${index + 1}. ${error}`);
                    });
                }

                if (result.successful > 0) {
                    console.log('\n✅ Questions imported successfully!');

                    // Check final count
                    const finalCount = await prisma.dsaQuestion.count({
                        where: {
                            isActive: true,
                        },
                    });
                    console.log(`📊 Final question count: ${finalCount}`);
                }
            } else {
                console.log(`❌ CSV file not found at: ${csvPath}`);
                console.log('Please ensure dsa_questions.csv exists in the backend directory.');
            }
        } else {
            console.log('\n✅ Sufficient questions available for interview assignment.');
        }

        // Check if there are any interviews without questions
        const interviewsWithoutQuestions = await prisma.interview.findMany({
            where: {
                interviewType: 'coding',
                interviewQuestions: {
                    none: {}
                }
            },
            include: {
                application: {
                    include: {
                        candidate: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (interviewsWithoutQuestions.length > 0) {
            console.log(`\n⚠️  Found ${interviewsWithoutQuestions.length} coding interviews without questions:`);
            interviewsWithoutQuestions.forEach((interview, index) => {
                console.log(`   ${index + 1}. Interview ID: ${interview.id}`);
                console.log(`      Candidate: ${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`);
                console.log(`      Email: ${interview.application.candidate.email}`);
                console.log(`      Created: ${interview.createdAt}`);
            });

            console.log('\n💡 You can assign questions to these interviews using the API endpoint:');
            console.log('   POST /api/v1/interviews/:interviewId/assign-questions');
        }

    } catch (error) {
        console.error('❌ Error checking/importing questions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkAndImportQuestions(); 
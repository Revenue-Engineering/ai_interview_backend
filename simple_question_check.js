const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkQuestions() {
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
            console.log('\n⚠️  Not enough questions found. You need to import questions from the CSV file.');
            console.log('💡 To import questions, you can:');
            console.log('   1. Use the DSA question upload endpoint');
            console.log('   2. Or run the bulk import functionality');
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

        // Show sample questions
        if (totalQuestions > 0) {
            console.log('\n📋 Sample questions in database:');
            const sampleQuestions = await prisma.dsaQuestion.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    level: true,
                },
                take: 5,
            });

            sampleQuestions.forEach((question, index) => {
                console.log(`   ${index + 1}. ${question.name} (${question.level}) - ID: ${question.id}`);
            });
        }

    } catch (error) {
        console.error('❌ Error checking questions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkQuestions(); 
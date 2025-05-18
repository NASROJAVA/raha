const db = require('../config/db-wrapper');

async function verifyStressLevels() {
  try {
    const surveys = await db.all('SELECT id, user_id, stress_level, completed_at FROM stress_surveys ORDER BY id');
    console.log('Converted stress levels:');
    console.log('------------------------');
    surveys.forEach(survey => {
      console.log(`ID: ${survey.id}, User: ${survey.user_id}, Stress Level: ${survey.stress_level}%, Date: ${survey.completed_at}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyStressLevels();

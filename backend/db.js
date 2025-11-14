const mysql = require('mysql2/promise');
require('dotenv').config(); // ✅ dotenv 불러오기

async function initDB() {
  // 환경 변수 확인
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('❌ DB 연결 설정 오류: .env 파일에 DB_HOST, DB_USER, DB_NAME이 설정되어 있는지 확인하세요.');
    throw new Error('데이터베이스 연결 설정이 누락되었습니다. .env 파일을 확인하세요.');
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'capstone'
    });
    
    console.log(`✅ DB 연결 성공: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    return connection;
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    console.error('   - DB_HOST:', process.env.DB_HOST);
    console.error('   - DB_USER:', process.env.DB_USER);
    console.error('   - DB_NAME:', process.env.DB_NAME);
    console.error('   - DB_PASSWORD:', process.env.DB_PASSWORD ? '***설정됨***' : '설정되지 않음');
    throw error;
  }
}

module.exports = initDB;
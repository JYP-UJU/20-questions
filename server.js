const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 제공
app.use(express.static('public'));

// Claude API 엔드포인트
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { baseQuestion, previousQuestions = [], stepNumber } = req.body;
    
    console.log('API 요청 받음:', { baseQuestion, previousQuestions, stepNumber });

    if (!process.env.CLAUDE_API_KEY) {
      console.error('Claude API key가 없습니다');
      return res.status(500).json({ error: 'API key not found' });
    }

    // 중복 제거된 이전 질문들
    const uniquePrevious = [...new Set(previousQuestions)];
    
const prompt = `초등학생이 "${baseQuestion}"에 대해 궁금해하고 있어요.

${uniquePrevious.length > 0 ? `이미 물어본 질문들: ${uniquePrevious.join(', ')}` : ''}

아이들이 쉽게 이해할 수 있는 짧고 간단한 질문 5개를 만들어주세요.

조건:
- 한 문장으로 짧게 (15자 이내)
- 쉬운 말로만 (전문용어 금지)
- 이전 질문과 완전히 다르게
- 호기심을 자극하는 질문
- "${baseQuestion}"와 직접 관련있게

예시: "나비는 어디서 살아?", "나비는 뭘 먹어?", "나비는 언제 자?"

JSON 형식으로만 응답:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}`;

    console.log('Claude API 호출:', { baseQuestion, previousCount: previousQuestions.length });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",  
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.CLAUDE_API_KEY,
    "anthropic-version": "2023-06-01"
  },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", 
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      console.error(`Claude API 오류: ${response.status}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.content[0].text.trim();
    
    // JSON 추출
    if (content.includes('{')) {
      content = content.substring(content.indexOf('{'));
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }
    
    const questions = JSON.parse(content);
    console.log('Claude 응답:', questions);
    
    res.json(questions);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패',
      details: error.message 
    });
  }
});

// 루트 경로
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

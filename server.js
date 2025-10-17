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
    const { baseQuestion, selectedConcepts, previousQuestion, userThought, previousQuestions = [] } = req.body;
    
    console.log('질문 생성 API 요청:', { baseQuestion, selectedConcepts, previousQuestion });

    if (!process.env.CLAUDE_API_KEY) {
      console.error('Claude API key가 없습니다');
      return res.status(500).json({ error: 'API key not found' });
    }

    const uniquePrevious = [...new Set(previousQuestions)];
    
    const prompt = `사용자가 "${baseQuestion}"에 대해 탐구 중입니다.

${userThought ? `
이전 질문: "${previousQuestion}"
사용자의 생각: "${userThought}"
` : ''}

선택한 개념어: ${selectedConcepts.join(', ')}

이 개념어들을 바탕으로 답을 찾는데 필요한 정보를 떠올리게 하는 질문 5개를 만들어주세요.

${uniquePrevious.length > 0 ? `이미 나온 질문 (중복 금지): ${uniquePrevious.join(', ')}` : ''}

조건:
- 짧고 명확하게 (한 문장)
- 답을 직접 주지 말고, 답을 찾는데 필요한 사실이나 정보를 생각하게 하는 질문
- 선택한 개념어와 관련된 질문
- 중복 금지
- 점점 답에 가까워지도록

JSON만 응답:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}`;

    console.log('Claude API 호출 시작');

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
    console.log('질문 생성 성공:', questions);
    
    res.json(questions);

  } catch (error) {
    console.error('질문 생성 API Error:', error);
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

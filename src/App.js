import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState('');
  const [showEvaluation, setShowEvaluation] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  const startSimulation = async (scenario) => {
    setMessages([]);
    setInput('');
    setIsSimulating(true);
    setShowEvaluation(false);
    setEvaluationResult('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/start-simulation?scenario=${scenario}`);
      const data = await response.json();
      setMessages([{ role: 'ai', text: data.text || '' }]);
    } catch (error) {
      console.error('Error starting simulation:', error);
      setMessages([{ role: 'error', text: 'シミュレーションの開始に失敗しました。' }]);
      setIsSimulating(false);
    }
  };

  const sendMessage = async () => {
    if (input.trim() === '' || !isSimulating) return;

    const currentInput = input;
    const historyToSend = messages.filter(msg => msg.role !== 'error').map(msg => ({
      role: msg.role,
      text: msg.text
    }));

    setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
    setInput('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history: historyToSend }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.text || '' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'error', text: 'AIとの通信中にエラーが発生しました。' }]);
    }
  };

  const endAndEvaluateSimulation = async () => {
    if (!isSimulating) return;
    setIsSimulating(false);

    try {
      const historyToEvaluate = messages.filter(msg => msg.role !== 'error');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyToEvaluate }),
      });
      const data = await response.json();
      setEvaluationResult(data.evaluation || '評価の取得に失敗しました。');
      setShowEvaluation(true);
    } catch (error) {
      console.error('Error evaluating simulation:', error);
      setEvaluationResult('評価の生成中にエラーが発生しました。');
      setShowEvaluation(true);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>急変時対応シミュレーター</h1>
        {!isSimulating ? (
          <div className="scenario-selection">
            <button onClick={() => startSimulation('discoverer')}>発見者として開始</button>
            <button onClick={() => startSimulation('responder')}>応援者として開始</button>
          </div>
        ) : (
          <button onClick={endAndEvaluateSimulation} disabled={!isSimulating}>
            評価・終了
          </button>
        )}
      </header>
      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>シナリオを選択してシミュレーションを開始してください。</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
            </div>
          ))}
           <div ref={messagesEndRef} />
        </div>
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isSimulating ? "あなたの行動を入力..." : "シミュレーションを開始してください"}
            disabled={!isSimulating}
          />
          <button onClick={sendMessage} disabled={!isSimulating}>送信</button>
        </div>
      </div>

      {showEvaluation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>評価結果</h2>
            <div className="evaluation-text" dangerouslySetInnerHTML={{ __html: evaluationResult.replace(/\n/g, '<br />').replace(/###/g, '<h3>').replace(/\*\*/g, '').replace(/\*/g, '<li>') }} />
            <button onClick={() => setShowEvaluation(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState('');
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
    setIsStarting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/start-simulation?scenario=${scenario}`);
      const data = await response.json();
      setMessages([{ role: 'ai', text: data.text || '' }]);
    } catch (error) {
      console.error('Error starting simulation:', error);
      setMessages([{ role: 'error', text: 'シミュレーションの開始に失敗しました。' }]);
      setIsSimulating(false);
    } finally {
      // テスト用に2秒の遅延を追加 (確認後削除してください)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsStarting(false);
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
    setIsSending(true);

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
    } finally {
      setIsSending(false);
    }
  };

  const endAndEvaluateSimulation = async () => {
    if (!isSimulating) return;
    setIsSimulating(false);
    setIsLoadingEvaluation(true);
    console.log("isLoadingEvaluation set to true");

    try {
      const historyToEvaluate = messages.filter(msg => msg.role !== 'error');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyToEvaluate }),
      });
      const data = await response.json();
      setEvaluationResult(data.evaluation || '評価の取得に失敗しました。');
    } catch (error) {
      console.error('Error evaluating simulation:', error);
      setEvaluationResult('評価の生成中にエラーが発生しました。');
    } finally {
      // 一時的に2秒の遅延を追加
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsLoadingEvaluation(false);
      console.log("isLoadingEvaluation set to false");
      setShowEvaluation(true);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>急変時対応シミュレーター</h1>
        {!isSimulating && !isStarting ? (
          <div className="scenario-selection">
            <button onClick={() => startSimulation('discoverer')} className="clickable">
              発見者として開始
            </button>
            <button onClick={() => startSimulation('responder')} className="clickable">
              応援者として開始
            </button>
          </div>
        ) : (
          !isSimulating && isStarting ? null : (
            <button onClick={endAndEvaluateSimulation} disabled={isLoadingEvaluation} className="clickable">
              {isLoadingEvaluation ? <><span className="button-spinner"></span>評価中...</> : '評価・終了'}
            </button>
          )
        )}
      </header>
      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && !isStarting && (
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
            disabled={!isSimulating || isSending}
          />
          <button onClick={sendMessage} disabled={!isSimulating || isSending} className="clickable">
            {isSending ? <><span className="button-spinner"></span>送信中...</> : '送信'}
          </button>
        </div>
      </div>

      {isStarting && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>シミュレーションを準備中です...</p>
        </div>
      )}

      {isLoadingEvaluation && !showEvaluation && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>AIが評価を生成中です。しばらくお待ちください...</p>
        </div>
      )}

      {showEvaluation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>評価結果</h2>
            <div className="evaluation-text" dangerouslySetInnerHTML={{ __html: evaluationResult.replace(/\n/g, '<br />').replace(/###/g, '<h3>').replace(/\*\*/g, '').replace(/\*/g, '<li>') }} />
            <button onClick={() => setShowEvaluation(false)} className="clickable">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

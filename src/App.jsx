import { useState, useRef } from 'react';
import { CanvasContainer } from './components/CanvasContainer';
import { Sidebar } from './components/Sidebar';
import './index.css';

function App() {
  const [selection, setSelection] = useState(null);
  const canvasRef = useRef(null);

  const handleSelectionChange = (data) => {
    setSelection(data);
  };

  const handleExport = () => {
    const manager = canvasRef.current?.getSceneManager();
    if (manager) {
      const json = manager.exportJSON();
      //console.log("Exported:", json);

      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'board.json';
      a.click();
      URL.revokeObjectURL(url);
      alert("Exported to board.json");
    }
  };

  const handleLoad = (data) => {
    const manager = canvasRef.current?.getSceneManager();
    if (manager) {
      manager.loadJSON(data);
    }
  };

  return (
    <div className="app-container">
      <CanvasContainer
        ref={canvasRef}
        onSelectionChange={handleSelectionChange}
      />
      <Sidebar
        selection={selection}
        onExport={handleExport}
        onLoad={handleLoad}
      />
    </div>
  );
}

export default App;

import { useState } from 'react';

export function Sidebar({ selection, onExport, onLoad }) {
    const [jsonInput, setJsonInput] = useState("");

    const handleLoad = () => {
        try {
            const data = JSON.parse(jsonInput);
            onLoad(data);
        } catch (e) {
            alert("Invalid JSON");
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.9)',
            borderLeft: '1px solid #ccc',
            padding: '20px',
            overflowY: 'auto'
        }}>
            <h2>PCB Editor</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3>Inspector</h3>
                {selection ? (
                    <div>
                        <p><strong>Type:</strong> {selection.type || (selection.id ? 'pad' : 'Unknown')}</p>
                        <p><strong>ID:</strong> {selection.id}</p>
                        {selection.pos && <p><strong>Pos:</strong> {selection.pos.join(', ')}</p>}
                        {selection.size && <p><strong>Size:</strong> {selection.size.join(' x ')}</p>}
                    </div>
                ) : (
                    <p>No selection</p>
                )}
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Controls</h3>
                <button onClick={onExport} style={{ marginRight: '10px' }}>Export JSON</button>
            </div>

            <hr />

            <div>
                <h3>Load Layout</h3>
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='Paste JSON here...'
                    style={{ width: '100%', height: '100px', marginBottom: '10px' }}
                />
                <button onClick={handleLoad}>Load</button>
            </div>
        </div>
    );
}

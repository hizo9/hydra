const waterQualityFields = [
    { 
        name: 'ph', 
        label: 'pH', 
        unit: '',
        tooltip: 'Measures acidity of water. Ideal range: 6.5–8.5. Outside this range can harm aquatic life.'
    },
    { 
        name: 'temperature_c', 
        label: 'Temperature', 
        unit: '°C',
        tooltip: 'Affects oxygen levels. Normal range: 0–30°C. Sudden changes stress organisms.'
    },
    { 
        name: 'turbidity_ntu', 
        label: 'Turbidity', 
        unit: 'NTU',
        tooltip: 'Cloudiness caused by suspended particles. Ideal: <5 NTU. High turbidity blocks sunlight.'
    },
    { 
        name: 'wqi_24h_prediction', 
        label: 'WQI 24h Prediction', 
        unit: '',
        tooltip: 'Water Quality Index (0–100). >75 = Good, 50–75 = Fair, <50 = Poor.'
    }
];

let multiChart = null;

document.addEventListener('DOMContentLoaded', () => {
    createMetricCards();
    initChart();
    setupRealtimeListener();
    
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            placement: 'top',
            trigger: 'hover focus'
        });
    });
});

function createMetricCards() {
    const container = document.getElementById('metrics-container');
    container.innerHTML = '';

    waterQualityFields.forEach(field => {
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-3';
        const statusDiv = field.name === 'wqi_24h_prediction' 
            ? `<div class="mt-2" id="status-${field.name}"></div>` 
            : '';
        
        // Info icon with tooltip
        const infoIcon = `<i class="ms-1" data-bs-toggle="tooltip" title="${field.tooltip}" style="cursor: help; font-size: 0.9em; color: #6c757d;">ⓘ</i>`;
        
        col.innerHTML = `
            <div class="card h-100">
                <div class="card-body text-center">
                    <h6 class="card-title d-inline-block">${field.label}${infoIcon}</h6>
                    <h3 class="card-text" id="metric-${field.name}">--</h3>
                    <small class="text-muted">${field.unit}</small>
                    ${statusDiv}
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function initChart() {
    const ctx = document.getElementById('wqiChart').getContext('2d');
    
    multiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'pH',
                    data: [],
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 3,
                    yAxisID: 'yPH'
                },
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 3,
                    yAxisID: 'yTemp'
                },
                {
                    label: 'Turbidity (NTU)',
                    data: [],
                    borderColor: '#FFD166',
                    backgroundColor: 'rgba(255, 209, 102, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 3,
                    yAxisID: 'yTurbidity'
                },
                {
                    label: 'WQI',
                    data: [],
                    borderColor: '#06D6A0',
                    backgroundColor: 'rgba(6, 214, 160, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#06D6A0',
                    yAxisID: 'yWQI'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    title: { display: true, text: 'Time', color: '#212529' },
                    ticks: { color: '#6c757d' },
                    grid: { color: '#dee2e6' }
                },
                yPH: {
                    position: 'left',
                    min: 0,
                    max: 14,
                    title: { display: true, text: 'pH', color: '#FF6B6B' },
                    ticks: { color: '#FF6B6B' },
                    grid: { drawOnChartArea: false }
                },
                yTemp: {
                    position: 'left',
                    min: 0,
                    max: 50,
                    title: { display: true, text: '°C', color: '#4ECDC4' },
                    ticks: { color: '#4ECDC4' },
                    grid: { drawOnChartArea: false }
                },
                yTurbidity: {
                    position: 'right',
                    min: 0,
                    suggestedMax: 1000,
                    title: { display: true, text: 'NTU', color: '#FFD166' },
                    ticks: { color: '#FFD166' },
                    grid: { drawOnChartArea: false }
                },
                yWQI: {
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'WQI', color: '#06D6A0' },
                    ticks: { color: '#06D6A0' },
                    grid: { drawOnChartArea: true, color: '#e9ecef' }
                }
            },
            plugins: {
                legend: { 
                    labels: { 
                        color: '#212529',
                        usePointStyle: true
                    } 
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#212529',
                    bodyColor: '#212529',
                    borderColor: '#e9ecef',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += context.parsed.y;
                            if (context.dataset.label === 'Temperature (°C)') label += '°C';
                            if (context.dataset.label === 'Turbidity (NTU)') label += ' NTU';
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    if (ts && typeof ts === 'object' && ts.toDate) {
        try { return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    }
    if (typeof ts === 'string' && ts.includes('seconds=')) {
        try {
            const seconds = parseInt(ts.match(/seconds=(\d+)/)[1]);
            const nanos = parseInt(ts.match(/nanoseconds=(\d+)/)[1]);
            const date = new Date(seconds * 1000 + nanos / 1000000);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
    }
    return typeof ts === 'string' ? ts : 'Invalid';
}

function updateMetric(name, value) {
    const metricEl = document.getElementById(`metric-${name}`);
    if (!metricEl || value === undefined || value === null) {
        metricEl.textContent = '--';
        return;
    }

    const displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
    metricEl.textContent = displayValue;

    if (name === 'wqi_24h_prediction') {
        const statusEl = document.getElementById(`status-${name}`);
        if (value < 50) {
            statusEl.textContent = '⚠️ Poor';
            statusEl.className = 'text-danger';
        } else if (value < 75) {
            statusEl.textContent = '🟡 Fair';
            statusEl.className = 'text-warning';
        } else {
            statusEl.textContent = '✅ Good';
            statusEl.className = 'text-success';
        }
    }
}

function updateChart(readings) {
    if (!multiChart) return;
    
    const reversedReadings = [...readings].reverse();
    const timestamps = reversedReadings.map(doc => formatTimestamp(doc.data().timestamp));
    
    multiChart.data.labels = timestamps;
    multiChart.data.datasets[0].data = reversedReadings.map(doc => doc.data().ph || null);
    multiChart.data.datasets[1].data = reversedReadings.map(doc => doc.data().temperature_c || null);
    multiChart.data.datasets[2].data = reversedReadings.map(doc => doc.data().turbidity_ntu || null);
    multiChart.data.datasets[3].data = reversedReadings.map(doc => doc.data().wqi_24h_prediction || null);
    
    multiChart.update('none');
}

function setupRealtimeListener() {
    try {
        const readingsRef = db.collection('readings').orderBy('timestamp', 'desc').limit(24);
        readingsRef.onSnapshot(snapshot => {
            const docs = snapshot.docs;
            const lastUpdatedEl = document.getElementById('last-updated');
            if (docs.length === 0) {
                lastUpdatedEl.textContent = 'No data available';
                return;
            }

            const latestData = docs[0].data();
            waterQualityFields.forEach(field => updateMetric(field.name, latestData[field.name]));

            const tableBody = document.getElementById('table-body');
            tableBody.innerHTML = '';
            docs.forEach(doc => {
                const d = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatTimestamp(d.timestamp)}</td>
                    <td>${d.ph !== undefined ? d.ph.toFixed(2) : '--'}</td>
                    <td>${d.temperature_c !== undefined ? d.temperature_c.toFixed(1) + '°C' : '--'}</td>
                    <td>${d.turbidity_ntu !== undefined ? d.turbidity_ntu.toFixed(1) + ' NTU' : '--'}</td>
                    <td>${d.wqi_24h_prediction !== undefined ? d.wqi_24h_prediction.toFixed(2) : '--'}</td>
                `;
                tableBody.appendChild(row);
            });

            updateChart(docs);
            lastUpdatedEl.textContent = `Last updated: ${formatTimestamp(docs[0].data().timestamp)}`;
        }, error => {
            console.error('Firestore error:', error);
            document.getElementById('last-updated').textContent = '❌ Error loading data';
        });
    } catch (err) {
        console.error('Setup error:', err);
        document.getElementById('last-updated').textContent = '❌ Init error';
    }
}

function exportToCSV() {
    const rows = [['Timestamp', 'pH', 'Temperature (°C)', 'Turbidity (NTU)', 'WQI']];
    
    document.querySelectorAll('#table-body tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length === 5) {
            rows.push([
                cols[0].textContent,
                cols[1].textContent === '--' ? '' : cols[1].textContent,
                cols[2].textContent === '--' ? '' : cols[2].textContent.replace('°C', '').trim(),
                cols[3].textContent === '--' ? '' : cols[3].textContent.replace('NTU', '').trim(),
                cols[4].textContent === '--' ? '' : cols[4].textContent
            ]);
        }
    });

    const csvContent = rows.map(e => e.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydra-readings-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
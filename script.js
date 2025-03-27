document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const toggleViewBtn = document.getElementById('toggleView');
    const memorySection = document.getElementById('memorySection');
    const schedulingSection = document.getElementById('schedulingSection');
    const initializeBtn = document.getElementById('initialize');
    const allocateBtn = document.getElementById('allocate');
    const deallocateBtn = document.getElementById('deallocate');
    const resetMemoryBtn = document.getElementById('resetMemory');
    const defragmentBtn = document.getElementById('defragment');
    const scheduleBtn = document.getElementById('schedule');
    const resetScheduleBtn = document.getElementById('resetSchedule');
    const addProcessBtn = document.getElementById('addProcess');
    const quantumGroup = document.getElementById('quantumGroup');
    const schedulingAlgo = document.getElementById('schedulingAlgo');
    const deallocateProcess = document.getElementById('deallocateProcess');
    
    // Memory Management Variables
    let memoryBlocks = [];
    let totalMemorySize = 0;
    let processes = {};
    let nextProcessId = 1;
    
    // Scheduling Variables
    let processesList = [];
    let time = 0;
    let ganttChart = [];
    let processDetails = {};
    
    // Toggle between Memory and Scheduling views
    toggleViewBtn.addEventListener('click', function() {
        memorySection.classList.toggle('active');
        schedulingSection.classList.toggle('active');
        
        if (memorySection.classList.contains('active')) {
            toggleViewBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Scheduling View';
        } else {
            toggleViewBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Memory View';
        }
    });
    
    // Show/hide quantum time input based on algorithm selection
    schedulingAlgo.addEventListener('change', function() {
        if (this.value === 'rr') {
            quantumGroup.style.display = 'block';
        } else {
            quantumGroup.style.display = 'none';
        }
    });
    
    // Initialize memory with the specified size
    initializeBtn.addEventListener('click', function() {
        const size = parseInt(document.getElementById('memorySize').value);
        
        if (isNaN(size) || size <= 0) {
            showOutput('Please enter a valid memory size (positive integer).', 'error');
            return;
        }
        
        totalMemorySize = size;
        memoryBlocks = [{ start: 0, size: size, status: 'free', processId: null }];
        processes = {};
        nextProcessId = 1;
        deallocateProcess.innerHTML = '<option value="">Select process</option>';
        deallocateProcess.disabled = true;
        
        renderMemoryBlocks();
        updateMemoryStats();
        showOutput(`Memory initialized with size ${size} bytes.`);
    });
    
    // Allocate memory for a process
    allocateBtn.addEventListener('click', function() {
        if (memoryBlocks.length === 0) {
            showOutput('Please initialize memory first.', 'error');
            return;
        }
        
        const size = parseInt(document.getElementById('allocateSize').value);
        const processId = document.getElementById('processId').value.trim();
        const strategy = document.getElementById('allocationStrategy').value;
        
        if (isNaN(size) || size <= 0) {
            showOutput('Please enter a valid allocation size (positive integer).', 'error');
            return;
        }
        
        if (processId === '') {
            showOutput('Please enter a process ID.', 'error');
            return;
        }
        
        if (processes[processId]) {
            showOutput(`Process ID "${processId}" already exists.`, 'error');
            return;
        }
        
        let allocated = false;
        let newMemoryBlocks = [...memoryBlocks];
        
        // Find a suitable block based on the allocation strategy
        let blockIndex = -1;
        switch (strategy) {
            case 'first-fit':
                blockIndex = newMemoryBlocks.findIndex(block => 
                    block.status === 'free' && block.size >= size);
                break;
            case 'best-fit':
                blockIndex = newMemoryBlocks.reduce((bestIdx, block, idx) => {
                    if (block.status === 'free' && block.size >= size) {
                        if (bestIdx === -1 || block.size < newMemoryBlocks[bestIdx].size) {
                            return idx;
                        }
                    }
                    return bestIdx;
                }, -1);
                break;
            case 'worst-fit':
                blockIndex = newMemoryBlocks.reduce((bestIdx, block, idx) => {
                    if (block.status === 'free' && block.size >= size) {
                        if (bestIdx === -1 || block.size > newMemoryBlocks[bestIdx].size) {
                            return idx;
                        }
                    }
                    return bestIdx;
                }, -1);
                break;
        }
        
        if (blockIndex === -1) {
            showOutput(`No suitable free block found for ${size} bytes allocation.`, 'error');
            return;
        }
        
        const block = newMemoryBlocks[blockIndex];
        
        // Split the block if there's remaining space
        if (block.size > size) {
            const remainingSize = block.size - size;
            newMemoryBlocks.splice(blockIndex, 1, 
                { start: block.start, size: size, status: 'allocated', processId: processId },
                { start: block.start + size, size: remainingSize, status: 'free', processId: null }
            );
        } else {
            newMemoryBlocks[blockIndex] = { ...block, status: 'allocated', processId: processId };
        }
        
        memoryBlocks = newMemoryBlocks;
        processes[processId] = { size: size };
        
        // Update deallocate dropdown
        updateDeallocateDropdown();
        
        renderMemoryBlocks();
        updateMemoryStats();
        showOutput(`Allocated ${size} bytes for process ${processId}.`);
        
        // Clear input fields
        document.getElementById('allocateSize').value = '';
        document.getElementById('processId').value = '';
    });
    
    // Update the deallocate process dropdown
    function updateDeallocateDropdown() {
        deallocateProcess.innerHTML = '<option value="">Select process</option>';
        const processIds = Object.keys(processes);
        
        if (processIds.length > 0) {
            deallocateProcess.disabled = false;
            processIds.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = id;
                deallocateProcess.appendChild(option);
            });
        } else {
            deallocateProcess.disabled = true;
        }
    }
    
    // Deallocate memory for a process
    deallocateBtn.addEventListener('click', function() {
        const processId = deallocateProcess.value;
        
        if (!processId) {
            showOutput('Please select a process to deallocate.', 'error');
            return;
        }
        
        // Find and free all blocks allocated to this process
        let newMemoryBlocks = [...memoryBlocks];
        let freedSize = 0;
        
        for (let i = 0; i < newMemoryBlocks.length; i++) {
            if (newMemoryBlocks[i].processId === processId) {
                newMemoryBlocks[i] = { 
                    ...newMemoryBlocks[i], 
                    status: 'free', 
                    processId: null 
                };
                freedSize += newMemoryBlocks[i].size;
            }
        }
        
        // Merge adjacent free blocks
        newMemoryBlocks = mergeAdjacentFreeBlocks(newMemoryBlocks);
        
        memoryBlocks = newMemoryBlocks;
        delete processes[processId];
        
        // Update deallocate dropdown
        updateDeallocateDropdown();
        
        renderMemoryBlocks();
        updateMemoryStats();
        showOutput(`Deallocated ${freedSize} bytes for process ${processId}.`);
    });
    
    // Merge adjacent free blocks
    function mergeAdjacentFreeBlocks(blocks) {
        let mergedBlocks = [];
        let i = 0;
        
        while (i < blocks.length) {
            let current = blocks[i];
            
            if (current.status === 'free') {
                let j = i + 1;
                let mergedSize = current.size;
                
                while (j < blocks.length && blocks[j].status === 'free') {
                    mergedSize += blocks[j].size;
                    j++;
                }
                
                mergedBlocks.push({
                    start: current.start,
                    size: mergedSize,
                    status: 'free',
                    processId: null
                });
                
                i = j;
            } else {
                mergedBlocks.push(current);
                i++;
            }
        }
        
        return mergedBlocks;
    }
    
    // Defragment memory
    defragmentBtn.addEventListener('click', function() {
        if (memoryBlocks.length === 0) {
            showOutput('Memory not initialized.', 'error');
            return;
        }
        
        // Separate allocated and free blocks
        const allocatedBlocks = memoryBlocks.filter(block => block.status === 'allocated');
        const freeBlocks = memoryBlocks.filter(block => block.status === 'free');
        
        if (freeBlocks.length <= 1) {
            showOutput('No significant fragmentation to defragment.', 'info');
            return;
        }
        
        // Calculate total free space
        const totalFree = freeBlocks.reduce((sum, block) => sum + block.size, 0);
        
        // Create new memory layout: all allocated blocks first, then one big free block
        let newMemoryBlocks = [];
        let currentStart = 0;
        
        // Add allocated blocks in order
        for (const block of allocatedBlocks) {
            newMemoryBlocks.push({
                start: currentStart,
                size: block.size,
                status: 'allocated',
                processId: block.processId
            });
            currentStart += block.size;
        }
        
        // Add one big free block at the end
        if (totalFree > 0) {
            newMemoryBlocks.push({
                start: currentStart,
                size: totalFree,
                status: 'free',
                processId: null
            });
        }
        
        memoryBlocks = newMemoryBlocks;
        
        renderMemoryBlocks();
        updateMemoryStats();
        showOutput(`Memory defragmented successfully. Free space consolidated into one block of ${totalFree} bytes.`);
    });
    
    // Reset memory
    resetMemoryBtn.addEventListener('click', function() {
        memoryBlocks = [];
        totalMemorySize = 0;
        processes = {};
        nextProcessId = 1;
        deallocateProcess.innerHTML = '<option value="">Select process</option>';
        deallocateProcess.disabled = true;
        
        document.getElementById('memory-blocks').innerHTML = '';
        updateMemoryStats();
        showOutput('Memory reset.');
    });
    
    // Render memory blocks visualization
    function renderMemoryBlocks() {
        const container = document.getElementById('memory-blocks');
        container.innerHTML = '';
        
        if (memoryBlocks.length === 0) {
            container.innerHTML = '<div class="memory-empty">Memory not initialized</div>';
            return;
        }
        
        const totalSize = memoryBlocks.reduce((sum, block) => sum + block.size, 0);
        const containerWidth = container.clientWidth;
        
        memoryBlocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = `memory-block ${block.status}`;
            
            // Calculate width based on block size proportion
            const widthPercentage = (block.size / totalSize) * 100;
            const minWidth = 50; // Minimum width in pixels for visibility
            const calculatedWidth = Math.max(minWidth, (widthPercentage / 100) * containerWidth);
            
            blockElement.style.width = `${calculatedWidth}px`;
            blockElement.style.backgroundColor = block.status === 'allocated' ? 
                'var(--allocated-color)' : 'var(--free-color)';
            
            blockElement.innerHTML = `
                <span>${block.size} bytes</span>
                ${block.processId ? `<span>${block.processId}</span>` : ''}
            `;
            
            container.appendChild(blockElement);
        });
    }
    
    // Update memory statistics
    function updateMemoryStats() {
        if (memoryBlocks.length === 0) {
            document.getElementById('total-memory').textContent = '0';
            document.getElementById('used-memory').textContent = '0';
            document.getElementById('used-percentage').textContent = '0';
            document.getElementById('free-memory').textContent = '0';
            document.getElementById('free-percentage').textContent = '0';
            document.getElementById('fragmentation').textContent = '0';
            return;
        }
        
        const totalMemory = memoryBlocks.reduce((sum, block) => sum + block.size, 0);
        const allocatedMemory = memoryBlocks
            .filter(block => block.status === 'allocated')
            .reduce((sum, block) => sum + block.size, 0);
        const freeMemory = totalMemory - allocatedMemory;
        const freePercentage = (freeMemory / totalMemory * 100).toFixed(2);
        const usedPercentage = (allocatedMemory / totalMemory * 100).toFixed(2);
        
        // Calculate fragmentation (percentage of free memory that is fragmented)
        const freeBlocks = memoryBlocks.filter(block => block.status === 'free');
        const totalFree = freeBlocks.reduce((sum, block) => sum + block.size, 0);
        const maxFreeBlock = freeBlocks.length > 0 ? 
            Math.max(...freeBlocks.map(block => block.size)) : 0;
        const fragmentation = totalFree > 0 ? 
            (1 - (maxFreeBlock / totalFree)) * 100 : 0;
        
        document.getElementById('total-memory').textContent = totalMemory;
        document.getElementById('used-memory').textContent = allocatedMemory;
        document.getElementById('used-percentage').textContent = usedPercentage;
        document.getElementById('free-memory').textContent = freeMemory;
        document.getElementById('free-percentage').textContent = freePercentage;
        document.getElementById('fragmentation').textContent = fragmentation.toFixed(2);
    }
    
    // Scheduling Functions
    
    // Parse process input
    function parseProcessInput() {
        const input = document.getElementById('processInput').value.trim();
        if (!input) return [];
        
        return input.split(';').map(processStr => {
            const parts = processStr.split(',');
            return {
                name: parts[0].trim(),
                arrivalTime: parseInt(parts[1]),
                burstTime: parseInt(parts[2]),
                priority: parts[3] ? parseInt(parts[3]) : 0,
                remainingTime: parseInt(parts[2]),
                startTime: null,
                finishTime: null,
                waitingTime: 0,
                turnaroundTime: 0,
                responseTime: null
            };
        });
    }
    
    // Add a new process
    addProcessBtn.addEventListener('click', function() {
        const processName = prompt('Enter process name (e.g., P4):');
        if (!processName) return;
        
        const arrivalTime = parseInt(prompt('Enter arrival time:'));
        if (isNaN(arrivalTime)) {
            showOutput('Invalid arrival time.', 'error');
            return;
        }
        
        const burstTime = parseInt(prompt('Enter burst time:'));
        if (isNaN(burstTime) || burstTime <= 0) {
            showOutput('Invalid burst time.', 'error');
            return;
        }
        
        const priority = parseInt(prompt('Enter priority (higher number = higher priority):') || 0);
        
        // Update the process input field
        const processInput = document.getElementById('processInput');
        const currentValue = processInput.value.trim();
        const newProcess = `${processName},${arrivalTime},${burstTime},${priority}`;
        
        processInput.value = currentValue ? `${currentValue};${newProcess}` : newProcess;
        showOutput(`Added process ${processName} with arrival ${arrivalTime}, burst ${burstTime}, priority ${priority}`);
    });
    
    // Run scheduling algorithm
    scheduleBtn.addEventListener('click', function() {
        processesList = parseProcessInput();
        
        if (processesList.length === 0) {
            showOutput('No processes to schedule.', 'error');
            return;
        }
        
        const algorithm = document.getElementById('schedulingAlgo').value;
        const quantum = algorithm === 'rr' ? 
            parseInt(document.getElementById('quantumTime').value) : null;
        
        if (algorithm === 'rr' && (isNaN(quantum) || quantum <= 0)) {
            showOutput('Please enter a valid quantum time.', 'error');
            return;
        }
        
        // Reset previous results
        ganttChart = [];
        processDetails = {};
        time = 0;
        
        // Initialize process details
        processesList.forEach(process => {
            processDetails[process.name] = {
                arrivalTime: process.arrivalTime,
                burstTime: process.burstTime,
                priority: process.priority,
                startTime: null,
                finishTime: null,
                waitingTime: 0,
                turnaroundTime: 0,
                responseTime: null
            };
        });
        
        // Clone the processes for simulation
        let readyQueue = [...processesList].map(p => ({ ...p }));
        let runningProcess = null;
        let completedProcesses = [];
        
        // Sort by arrival time initially
        readyQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        // Helper function to get next process based on algorithm
        const getNextProcess = () => {
            if (readyQueue.length === 0) return null;
            
            const arrivedProcesses = readyQueue.filter(p => p.arrivalTime <= time);
            if (arrivedProcesses.length === 0) return null;
            
            switch (algorithm) {
                case 'fcfs':
                    return arrivedProcesses[0];
                case 'sjf':
                    return arrivedProcesses.reduce((min, p) => 
                        p.burstTime < min.burstTime ? p : min, arrivedProcesses[0]);
                case 'srtf':
                    return arrivedProcesses.reduce((min, p) => 
                        p.remainingTime < min.remainingTime ? p : min, arrivedProcesses[0]);
                case 'rr':
                    return arrivedProcesses[0];
                case 'priority':
                    return arrivedProcesses.reduce((max, p) => 
                        p.priority > max.priority ? p : max, arrivedProcesses[0]);
                case 'priority_p':
                    return arrivedProcesses.reduce((max, p) => 
                        p.priority > max.priority ? p : max, arrivedProcesses[0]);
                default:
                    return arrivedProcesses[0];
            }
        };
        
        // Simulation loop
        while (completedProcesses.length < processesList.length) {
            // Check for new arrivals
            const newArrivals = readyQueue.filter(p => p.arrivalTime === time);
            
            // Get the next process to run
            let nextProcess = getNextProcess();
            
            // For preemptive algorithms, check if we should switch
            if (runningProcess && (algorithm === 'srtf' || algorithm === 'priority_p' || algorithm === 'rr')) {
                if (algorithm === 'srtf' && nextProcess && nextProcess.remainingTime < runningProcess.remainingTime) {
                    // Preempt for SRTF
                    readyQueue.push(runningProcess);
                    runningProcess = nextProcess;
                    readyQueue = readyQueue.filter(p => p.name !== nextProcess.name);
                } else if (algorithm === 'priority_p' && nextProcess && nextProcess.priority > runningProcess.priority) {
                    // Preempt for Priority (preemptive)
                    readyQueue.push(runningProcess);
                    runningProcess = nextProcess;
                    readyQueue = readyQueue.filter(p => p.name !== nextProcess.name);
                } else if (algorithm === 'rr' && runningProcess.timeUsed >= quantum) {
                    // Time quantum expired for RR
                    readyQueue.push(runningProcess);
                    runningProcess = nextProcess;
                    readyQueue = readyQueue.filter(p => p.name !== nextProcess.name);
                }
            } else if (!runningProcess && nextProcess) {
                // No process running, take the next one
                runningProcess = nextProcess;
                readyQueue = readyQueue.filter(p => p.name !== nextProcess.name);
                
                // Set start time if not set
                if (processDetails[runningProcess.name].startTime === null) {
                    processDetails[runningProcess.name].startTime = time;
                    processDetails[runningProcess.name].responseTime = 
                        time - runningProcess.arrivalTime;
                }
            }
            
            // Execute the current process
            if (runningProcess) {
                // Record in Gantt chart
                if (ganttChart.length === 0 || ganttChart[ganttChart.length - 1].name !== runningProcess.name) {
                    ganttChart.push({
                        name: runningProcess.name,
                        startTime: time,
                        endTime: time + 1
                    });
                } else {
                    ganttChart[ganttChart.length - 1].endTime++;
                }
                
                // Track time used for RR
                if (algorithm === 'rr') {
                    if (!runningProcess.timeUsed) runningProcess.timeUsed = 0;
                    runningProcess.timeUsed++;
                }
                
                // Decrement remaining time
                runningProcess.remainingTime--;
                
                // Check if process completed
                if (runningProcess.remainingTime === 0) {
                    processDetails[runningProcess.name].finishTime = time + 1;
                    processDetails[runningProcess.name].turnaroundTime = 
                        (time + 1) - runningProcess.arrivalTime;
                    processDetails[runningProcess.name].waitingTime = 
                        processDetails[runningProcess.name].turnaroundTime - runningProcess.burstTime;
                    
                    completedProcesses.push(runningProcess);
                    runningProcess = null;
                }
            } else {
                // CPU is idle
                if (ganttChart.length === 0 || ganttChart[ganttChart.length - 1].name !== 'IDLE') {
                    ganttChart.push({
                        name: 'IDLE',
                        startTime: time,
                        endTime: time + 1
                    });
                } else {
                    ganttChart[ganttChart.length - 1].endTime++;
                }
            }
            
            // Increment waiting time for processes in ready queue
            readyQueue.forEach(p => {
                if (p.arrivalTime <= time) {
                    processDetails[p.name].waitingTime++;
                }
            });
            
            time++;
        }
        
        // Render results
        renderGanttChart();
        renderProcessTable();
        calculateMetrics();
        
        showOutput(`Scheduling completed using ${getAlgorithmName(algorithm)} algorithm.`);
    });
    
    // Get full algorithm name
    function getAlgorithmName(shortName) {
        const names = {
            'fcfs': 'First Come First Serve',
            'sjf': 'Shortest Job First',
            'srtf': 'Shortest Remaining Time First',
            'rr': 'Round Robin',
            'priority': 'Priority (Non-preemptive)',
            'priority_p': 'Priority (Preemptive)'
        };
        return names[shortName] || shortName;
    }
    
    // Render Gantt chart
    function renderGanttChart() {
        const ganttContainer = document.getElementById('gantt-chart');
        const timelineContainer = document.getElementById('timeline');
        
        ganttContainer.innerHTML = '';
        timelineContainer.innerHTML = '';
        
        if (ganttChart.length === 0) return;
        
        // Generate colors for processes
        const colors = {};
        const colorPalette = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
            '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b'
        ];
        
        processesList.forEach((process, index) => {
            colors[process.name] = colorPalette[index % colorPalette.length];
        });
        colors['IDLE'] = 'var(--idle-color)';
        
        // Create Gantt chart blocks
        ganttChart.forEach(block => {
            const duration = block.endTime - block.startTime;
            const blockElement = document.createElement('div');
            blockElement.className = 'gantt-block';
            blockElement.style.backgroundColor = colors[block.name];
            blockElement.style.minWidth = `${duration * 40}px`;
            blockElement.innerHTML = `
                <span>${block.name}</span>
                <div class="tooltip">${block.name} (${block.startTime}-${block.endTime})</div>
            `;
            ganttContainer.appendChild(blockElement);
        });
        
        // Create timeline
        const maxTime = ganttChart[ganttChart.length - 1].endTime;
        for (let t = 0; t <= maxTime; t++) {
            const markElement = document.createElement('div');
            markElement.className = 'timeline-mark';
            markElement.textContent = t;
            timelineContainer.appendChild(markElement);
        }
    }
    
    // Render process table
    function renderProcessTable() {
        const tableBody = document.querySelector('#processTable tbody');
        tableBody.innerHTML = '';
        
        processesList.forEach(process => {
            const details = processDetails[process.name];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${process.name}</td>
                <td>${details.arrivalTime}</td>
                <td>${details.burstTime}</td>
                <td>${details.priority}</td>
                <td>${details.startTime !== null ? details.startTime : '-'}</td>
                <td>${details.finishTime !== null ? details.finishTime : '-'}</td>
                <td>${details.waitingTime}</td>
                <td>${details.turnaroundTime}</td>
                <td>${details.responseTime !== null ? details.responseTime : '-'}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    // Calculate and display metrics
    function calculateMetrics() {
        const waitingTimes = processesList.map(p => processDetails[p.name].waitingTime);
        const turnaroundTimes = processesList.map(p => processDetails[p.name].turnaroundTime);
        const responseTimes = processesList.map(p => processDetails[p.name].responseTime || 0);
        
        const avgWaiting = waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length;
        const avgTurnaround = turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length;
        const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        const maxTime = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1].endTime : 0;
        const throughput = processesList.length / maxTime;
        
        document.getElementById('avg-waiting').innerHTML = 
            `<strong>Average Waiting Time:</strong> ${avgWaiting.toFixed(2)}`;
        document.getElementById('avg-turnaround').innerHTML = 
            `<strong>Average Turnaround Time:</strong> ${avgTurnaround.toFixed(2)}`;
        document.getElementById('avg-response').innerHTML = 
            `<strong>Average Response Time:</strong> ${avgResponse.toFixed(2)}`;
        document.getElementById('throughput').innerHTML = 
            `<strong>Throughput:</strong> ${throughput.toFixed(4)} processes per unit time`;
    }
    
    // Reset scheduling
    resetScheduleBtn.addEventListener('click', function() {
        document.getElementById('gantt-chart').innerHTML = '';
        document.getElementById('timeline').innerHTML = '';
        document.querySelector('#processTable tbody').innerHTML = '';
        document.getElementById('avg-waiting').textContent = '';
        document.getElementById('avg-turnaround').textContent = '';
        document.getElementById('avg-response').textContent = '';
        document.getElementById('throughput').textContent = '';
        showOutput('Scheduling reset.');
    });
    
    // Show output message
    function showOutput(message, type = 'info') {
        const output = document.getElementById('output-text');
        const messageElement = document.createElement('div');
        
        messageElement.textContent = message;
        messageElement.className = `output-${type}`;
        
        // Add timestamp
        const now = new Date();
        const timestamp = now.toLocaleTimeString();
        messageElement.textContent = `[${timestamp}] ${message}`;
        
        output.prepend(messageElement);
        
        // Auto-scroll to top
        output.scrollTop = 0;
    }
    
    // Initialize the page
    updateMemoryStats();
});
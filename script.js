// 核心：请在这里填入你的 Covalent API Key。这是免费的。
const COVALENT_API_KEY = 'YOUR_COVALENT_API_KEY';
// 核心：请在这里填入你的 Infura/Alchemy API Key。这是免费的。
const RPC_API_KEY = 'HyoLOvIUo+BOj8YczOlgHbXkkaEM2E/S73PspQjRLJfSiCA7F0YbmA';

// 全局变量，用于存储历史记录
let savedQueryGroups = {};
let currentQueryData = null;

// 页面加载时执行的函数，用于加载历史记录和上次的临时查询结果
function loadInitialState() {
    const storedGroups = localStorage.getItem('blockchainQueryGroups');
    if (storedGroups) {
        savedQueryGroups = JSON.parse(storedGroups);
    }

    const storedTempQuery = localStorage.getItem('tempQuery');
    if (storedTempQuery) {
        currentQueryData = JSON.parse(storedTempQuery);
        document.getElementById('chainSelect').value = currentQueryData.chainId;
        document.getElementById('customRpcUrl').value = currentQueryData.customRpcUrl;
        document.getElementById('tokenAddress').value = currentQueryData.tokenAddress;
        document.getElementById('addressInput').value = currentQueryData.addresses.join('\n');
        document.getElementById('results').textContent = currentQueryData.results;
        document.getElementById('saveButton').style.display = 'inline-block';
        document.getElementById('downloadButton').style.display = 'inline-block';
    }

    renderHistoryList();
}

// 渲染历史记录列表到页面
function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    const groupKeys = Object.keys(savedQueryGroups);
    if (groupKeys.length === 0) {
        historyList.innerHTML = '<li style="text-align: center; color: #888;">暂无历史记录</li>';
        return;
    }

    groupKeys.forEach(groupKey => {
        const group = savedQueryGroups[groupKey];
        const groupLi = document.createElement('li');
        groupLi.classList.add('address-group');
        groupLi.innerHTML = `
            <h3>地址群 (${group.addresses.length}个地址)</h3>
            <button class="quick-query-btn" data-group-key="${groupKey}">快速加载地址</button>
            <ul class="nested-queries"></ul>
        `;
        
        const nestedUl = groupLi.querySelector('.nested-queries');
        group.queries.forEach((query, queryIndex) => {
            const queryLi = document.createElement('li');
            queryLi.innerHTML = `
                <span>${query.timestamp} - ${query.chainName} (${query.tokenName})</span>
                <div>
                    <button class="load-btn" data-group-key="${groupKey}" data-query-index="${queryIndex}">加载</button>
                    <button class="delete-btn" data-group-key="${groupKey}" data-query-index="${queryIndex}">删除</button>
                </div>
            `;
            nestedUl.appendChild(queryLi);
        });
        historyList.appendChild(groupLi);
    });

    document.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', loadQuery);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteQuery);
    });
    document.querySelectorAll('.quick-query-btn').forEach(btn => {
        btn.addEventListener('click', quickQuery);
    });
}

function loadQuery(event) {
    const groupKey = event.target.dataset.groupKey;
    const queryIndex = event.target.dataset.queryIndex;
    const query = savedQueryGroups[groupKey].queries[queryIndex];

    document.getElementById('chainSelect').value = query.chainId;
    document.getElementById('customRpcUrl').value = query.customRpcUrl;
    document.getElementById('tokenAddress').value = query.tokenAddress;
    document.getElementById('addressInput').value = query.addresses.join('\n');
    document.getElementById('results').textContent = query.results;
    
    currentQueryData = query;
    document.getElementById('saveButton').style.display = 'inline-block';
    document.getElementById('downloadButton').style.display = 'inline-block';
    
    alert('历史记录已加载到输入框。');
}

function deleteQuery(event) {
    if (confirm('确定要删除这条记录吗？')) {
        const groupKey = event.target.dataset.groupKey;
        const queryIndex = event.target.dataset.queryIndex;
        
        savedQueryGroups[groupKey].queries.splice(queryIndex, 1);

        if (savedQueryGroups[groupKey].queries.length === 0) {
            delete savedQueryGroups[groupKey];
        }

        localStorage.setItem('blockchainQueryGroups', JSON.stringify(savedQueryGroups));
        renderHistoryList();
    }
}

function quickQuery(event) {
    const groupKey = event.target.dataset.groupKey;
    const group = savedQueryGroups[groupKey];

    if (group && group.addresses.length > 0) {
        document.getElementById('addressInput').value = group.addresses.join('\n');
        
        alert('地址已加载到输入框。请选择您想查询的链和代币，然后点击“查询”按钮。');
    } else {
        alert('该地址群为空，无法进行快速加载。');
    }
}

document.getElementById('saveButton').addEventListener('click', () => {
    if (!currentQueryData) {
        alert('没有可以保存的查询结果。');
        return;
    }

    const addressesKey = JSON.stringify(currentQueryData.addresses);

    let isAlreadySaved = false;
    if (savedQueryGroups[addressesKey]) {
        isAlreadySaved = savedQueryGroups[addressesKey].queries.some(q => 
            q.chainId === currentQueryData.chainId &&
            q.customRpcUrl === currentQueryData.customRpcUrl &&
            q.tokenAddress === currentQueryData.tokenAddress
        );
    }
    
    if (isAlreadySaved) {
        alert('该查询记录已存在于历史记录中。');
        return;
    }

    currentQueryData.timestamp = new Date().toLocaleString();
    const tokenSymbol = document.getElementById('tokenAddress').value.trim() ? `代币(${document.getElementById('tokenAddress').value.trim().substring(0, 6)}...)` : (document.getElementById('chainSelect').options[document.getElementById('chainSelect').selectedIndex].text);
    currentQueryData.tokenName = tokenSymbol;

    if (!savedQueryGroups[addressesKey]) {
        savedQueryGroups[addressesKey] = {
            addresses: currentQueryData.addresses,
            queries: []
        };
    }
    
    savedQueryGroups[addressesKey].queries.unshift(currentQueryData);
    localStorage.setItem('blockchainQueryGroups', JSON.stringify(savedQueryGroups));
    
    renderHistoryList();
    alert('查询结果已保存到历史记录。');
});

document.getElementById('downloadButton').addEventListener('click', () => {
    if (!currentQueryData || !currentQueryData.results) {
        alert('没有可导出的数据。');
        return;
    }

    const rows = currentQueryData.results.split('\n');
    let csvContent = 'Address,Balance,Symbol\n';
    
    rows.forEach(row => {
        if (row.includes(':')) {
            const parts = row.split(':');
            const address = parts[0].trim();
            const balanceAndSymbol = parts[1].trim().split(' ');
            const balance = balanceAndSymbol[0];
            const symbol = balanceAndSymbol[1];
            csvContent += `"${address}","${balance}","${symbol}"\n`;
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `blockchain_balances_${new Date().toLocaleDateString()}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('checkButton').addEventListener('click', async () => {
    const addressesText = document.getElementById('addressInput').value;
    const chainId = document.getElementById('chainSelect').value;
    const customRpcUrl = document.getElementById('customRpcUrl').value.trim();
    const tokenAddress = document.getElementById('tokenAddress').value.trim();
    const resultsElement = document.getElementById('results');

    resultsElement.textContent = '正在查询，请稍候...';

    const addresses = addressesText.split('\n').map(addr => addr.trim()).filter(addr => addr.length > 0);
    if (addresses.length === 0) {
        resultsElement.textContent = '请输入至少一个地址。';
        return;
    }

    let output = '';
    const BATCH_SIZE = 10;
    const DELAY_MS = 100;

    if (tokenAddress || customRpcUrl) {
        let providerUrl;
        if (customRpcUrl) {
            providerUrl = customRpcUrl;
        } else {
            const rpcMap = {
                '1': `https://mainnet.infura.io/v3/${RPC_API_KEY}`,
                '137': `https://polygon-mainnet.infura.io/v3/${RPC_API_KEY}`,
                '56': 'https://bsc-dataseed.bnbchain.org'
            };
            providerUrl = rpcMap[chainId];

            if (providerUrl.includes('YOUR_INFURA_API_KEY') && !customRpcUrl) {
                resultsElement.textContent = '请先在脚本中配置您的 Infura/Alchemy API Key。';
                return;
            }
        }
        
        try {
            const provider = new ethers.providers.JsonRpcProvider(providerUrl);
            const isCustomToken = !!tokenAddress;
            const erc20Abi = isCustomToken ? ["function balanceOf(address owner) view returns (uint256)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"] : null;
            const tokenContract = isCustomToken ? new ethers.Contract(tokenAddress, erc20Abi, provider) : null;
            const promises = [];

            for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
                const batch = addresses.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map(async (address) => {
                    if (!ethers.utils.isAddress(address)) {
                        return { address, error: '地址格式错误。' };
                    }
                    
                    let balance = 0;
                    let symbol = '';
                    
                    try {
                        if (isCustomToken) {
                            const [rawBalance, tokenSymbol, tokenDecimals] = await Promise.all([
                                tokenContract.balanceOf(address),
                                tokenContract.symbol(),
                                tokenContract.decimals()
                            ]);
                            balance = ethers.utils.formatUnits(rawBalance, tokenDecimals);
                            symbol = tokenSymbol;
                        } else {
                            const rawBalance = await provider.getBalance(address);
                            balance = ethers.utils.formatEther(rawBalance);
                            const network = await provider.getNetwork();
                            symbol = network.name === 'homestead' ? 'ETH' : network.name.toUpperCase();
                        }
                        return { address, balance, symbol };
                    } catch (err) {
                        return { address, error: '查询失败。' };
                    }
                });
                
                promises.push(...batchPromises);
                
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }

            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res.error) {
                    output += `${res.address}: ${res.error}\n`;
                } else {
                    output += `${res.address}: ${res.balance} ${res.symbol}\n`;
                }
            });
        } catch (err) {
            output = `RPC查询过程中出现错误：${err.message || err}`;
            console.error(err);
        }
    } 
    else {
        if (!COVALENT_API_KEY) {
            resultsElement.textContent = '请先在脚本中配置您的 Covalent API Key。';
            return;
        }

        const results = [];
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const url = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.data && data.data.items) {
                    const nativeToken = data.data.items.find(item => item.native_token);
                    if (nativeToken) {
                        const balance = nativeToken.balance / Math.pow(10, nativeToken.contract_decimals);
                        results.push({ address, balance, symbol: nativeToken.contract_ticker_symbol });
                    } else {
                        results.push({ address, error: '找不到主网币余额。' });
                    }
                } else {
                    results.push({ address, error: 'API查询失败。' });
                }
            } catch (err) {
                results.push({ address, error: '网络错误或查询失败。' });
            }
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
        
        results.forEach(res => {
            if (res.error) {
                output += `${res.address}: ${res.error}\n`;
            } else {
                output += `${res.address}: ${res.balance} ${res.symbol}\n`;
            }
        });
    }

    currentQueryData = {
        chainName: document.getElementById('chainSelect').options[document.getElementById('chainSelect').selectedIndex].text,
        chainId: chainId,
        customRpcUrl: customRpcUrl,
        tokenAddress: tokenAddress,
        addresses: addresses,
        results: output
    };

    localStorage.setItem('tempQuery', JSON.stringify(currentQueryData));

    document.getElementById('results').textContent = output;
    document.getElementById('saveButton').style.display = 'inline-block';
    document.getElementById('downloadButton').style.display = 'inline-block';
});

// 页面加载时执行
window.onload = loadInitialState;

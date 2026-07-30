/* ==========================================================
   DASHBOARD COMERCIAL UNIFAHE — UNIDADE CENTRAL
========================================================== */

const CONFIG = {
    unidade: "UNIDADE CENTRAL",
    campos: {
        data: "1",
        vendedor: "3",
        polo: "4",
        curso: "12",
        boleto: "16",
        cartaoAvista: "17",
        taxaMatricula: "26"
    }
};

let dadosOriginais = [];
let dadosFiltrados = [];
let graficoRanking = null;
let graficoEvolucao = null;
let graficoCursos = null;

const elementos = {
    totalMatriculas: document.getElementById("totalMatriculas"),
    matriculasHoje: document.getElementById("matriculasHoje"),
    vendedoresAtivos: document.getElementById("totalVendedores"),
    mediaDiaria: document.getElementById("mediaDiaria"),
    melhorVendedor: document.getElementById("melhorVendedor"),
    melhorVendedorQuantidade: document.getElementById("melhorVendedorQuantidade"),
    cursoDestaque: document.getElementById("cursoDestaque"),
    cursoDestaqueQuantidade: document.getElementById("cursoDestaqueQuantidade"),
    periodoExibicao: document.getElementById("periodoAnalisado"),
    comparativoSemana: document.getElementById("variacaoSemanal"),
    comparativoDescricao: document.getElementById("variacaoSemanalDetalhe"),
    ultimaAtualizacao: document.getElementById("ultimaAtualizacao"),
    btnAtualizar: document.getElementById("btnAtualizar"),
    mensagemStatus: document.getElementById("mensagemStatus"),
    textoMensagemStatus: document.getElementById("textoMensagemStatus"),
    faturamentoBoleto: document.getElementById("faturamentoBoleto"),
    quantidadeBoleto: document.getElementById("quantidadeBoleto"),
    faturamentoCartao: document.getElementById("faturamentoCartao"),
    quantidadeCartao: document.getElementById("quantidadeCartao"),
    faturamentoTaxa: document.getElementById("faturamentoTaxa"),
    quantidadeTaxa: document.getElementById("quantidadeTaxa"),
    filtroDataInicio: document.getElementById("filtroDataInicio"),
    filtroDataFim: document.getElementById("filtroDataFim"),
    filtroPolo: document.getElementById("filtroPolo"),
    filtroConsultor: document.getElementById("filtroConsultor"),
    btnLimparFiltros: document.getElementById("btnLimparFiltros")
};

function limparTexto(valor) {
    return valor === null || valor === undefined ? "" : String(valor).trim();
}

function criarDataLocal(ano, mes, dia) {
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (Number.isNaN(data.getTime())) return null;
    if (data.getFullYear() !== Number(ano) || data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(dia)) return null;
    data.setHours(0, 0, 0, 0);
    return data;
}

function converterData(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return criarDataLocal(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }

    const texto = String(valor).trim();
    const brasileiro = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brasileiro) return criarDataLocal(brasileiro[3], brasileiro[2], brasileiro[1]);

    const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return criarDataLocal(iso[1], iso[2], iso[3]);

    const serial = Number(texto.replace(",", "."));
    if (Number.isFinite(serial) && serial >= 20000 && serial <= 80000) {
        const dataUTC = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
        return criarDataLocal(dataUTC.getUTCFullYear(), dataUTC.getUTCMonth() + 1, dataUTC.getUTCDate());
    }
    return null;
}

function converterValorMonetario(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    let texto = String(valor).trim().replace(/\s/g, "").replace(/R\$/gi, "");
    if (!texto) return 0;
    if (texto.includes(".") && texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
    else if (texto.includes(",")) texto = texto.replace(",", ".");
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
}

function obterChaveData(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function dataDoInput(valor, fimDoDia = false) {
    const data = converterData(valor);
    if (data && fimDoDia) data.setHours(23, 59, 59, 999);
    return data;
}

function formatarDataBrasileira(data) {
    return data && !Number.isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "—";
}

function formatarDataCurta(data) {
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatarNumero(valor) { return Number(valor || 0).toLocaleString("pt-BR"); }
function formatarMoeda(valor) { return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function formatarQuantidadeMatriculas(qtd) { return `${qtd} ${qtd === 1 ? "matrícula" : "matrículas"}`; }

function datasSaoIguais(a, b) { return a && b && obterChaveData(a) === obterChaveData(b); }
function registroEstaNoPeriodo(registro, inicio, fim) { return Boolean(registro.data && registro.data >= inicio && registro.data <= fim); }

function contarOcorrencias(dados, campo) {
    return dados.reduce((acc, registro) => {
        const valor = limparTexto(registro[campo]);
        if (valor) acc[valor] = (acc[valor] || 0) + 1;
        return acc;
    }, {});
}
function contarValoresUnicos(dados, campo) { return new Set(dados.map(r => limparTexto(r[campo])).filter(Boolean)).size; }
function obterMaiorOcorrencia(dados, campo) {
    const ranking = Object.entries(contarOcorrencias(dados, campo)).sort((a, b) => b[1] - a[1]);
    return ranking.length ? { nome: ranking[0][0], quantidade: ranking[0][1] } : { nome: "—", quantidade: 0 };
}

function exibirMensagem(texto, tipo = "normal") {
    if (!elementos.mensagemStatus || !elementos.textoMensagemStatus) return;
    elementos.textoMensagemStatus.textContent = texto;
    elementos.mensagemStatus.classList.remove("erro", "sucesso");
    if (["erro", "sucesso"].includes(tipo)) elementos.mensagemStatus.classList.add(tipo);
    elementos.mensagemStatus.classList.add("visivel");
}

function definirEstadoCarregamento(estado) {
    if (!elementos.btnAtualizar) return;
    elementos.btnAtualizar.disabled = estado;
    const icone = elementos.btnAtualizar.querySelector("i");
    if (icone) icone.classList.toggle("icone-girando", estado);
}

function atualizarHorario() {
    if (elementos.ultimaAtualizacao) elementos.ultimaAtualizacao.textContent = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function preencherSelect(select, valores, textoTodos) {
    if (!select) return;
    const selecionado = select.value;
    select.innerHTML = `<option value="">${textoTodos}</option>`;
    [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(valor => {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
    });
    if ([...select.options].some(op => op.value === selecionado)) select.value = selecionado;
}

function configurarFiltrosIniciais() {
    if (!dadosOriginais.length) return;
    const datas = dadosOriginais.map(r => r.data).filter(Boolean).sort((a, b) => a - b);
    const min = datas[0];
    const max = datas[datas.length - 1];
    if (elementos.filtroDataInicio && !elementos.filtroDataInicio.value) elementos.filtroDataInicio.value = obterChaveData(min);
    if (elementos.filtroDataFim && !elementos.filtroDataFim.value) elementos.filtroDataFim.value = obterChaveData(max);
    preencherSelect(elementos.filtroPolo, dadosOriginais.map(r => r.polo), "Todos os polos");
    preencherSelect(elementos.filtroConsultor, dadosOriginais.map(r => r.vendedor), "Todos os consultores");
}

function obterPeriodoSelecionado() {
    const datas = dadosOriginais.map(r => r.data).filter(Boolean).sort((a, b) => a - b);
    const inicioPadrao = datas[0] || new Date();
    const fimPadrao = datas[datas.length - 1] || new Date();
    const inicio = dataDoInput(elementos.filtroDataInicio?.value) || new Date(inicioPadrao);
    const fim = dataDoInput(elementos.filtroDataFim?.value, true) || new Date(fimPadrao);
    fim.setHours(23, 59, 59, 999);
    return inicio <= fim ? { inicio, fim } : { inicio: dataDoInput(elementos.filtroDataFim.value), fim: dataDoInput(elementos.filtroDataInicio.value, true) };
}

async function carregarDados() {
    if (typeof API_URL === "undefined") throw new Error("A constante API_URL não foi encontrada no api.js.");
    const resposta = await fetch(API_URL, { method: "GET", cache: "no-store" });
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
    const json = await resposta.json();
    if (!Array.isArray(json)) throw new Error("A API não retornou uma lista válida.");

    dadosOriginais = json.map(registro => ({
        data: converterData(registro[CONFIG.campos.data]),
        vendedor: limparTexto(registro[CONFIG.campos.vendedor]),
        polo: limparTexto(registro[CONFIG.campos.polo]),
        curso: limparTexto(registro[CONFIG.campos.curso]),
        boleto: converterValorMonetario(registro[CONFIG.campos.boleto]),
        cartaoAvista: converterValorMonetario(registro[CONFIG.campos.cartaoAvista]),
        taxaMatricula: converterValorMonetario(registro[CONFIG.campos.taxaMatricula])
    })).filter(registro => registro.data && !registro.vendedor.toUpperCase().includes("VENDEDOR") && !registro.curso.toUpperCase().includes("CURSO"));

    configurarFiltrosIniciais();
    aplicarFiltros();
    atualizarHorario();
}

function animarNumero(elemento, valorFinal, casas = 0) {
    if (!elemento) return;
    elemento.textContent = Number(valorFinal || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function contarMatriculasHoje(dados) { const hoje = new Date(); return dados.filter(r => datasSaoIguais(r.data, hoje)).length; }
function calcularMediaDiaria(dados) {
    const diasComRegistro = new Set(dados.map(r => obterChaveData(r.data)).filter(Boolean)).size;
    return diasComRegistro ? dados.length / diasComRegistro : 0;
}

function atualizarIndicadores(dados) {
    animarNumero(elementos.totalMatriculas, dados.length);
    animarNumero(elementos.matriculasHoje, contarMatriculasHoje(dados));
    animarNumero(elementos.vendedoresAtivos, contarValoresUnicos(dados, "vendedor"));
    animarNumero(elementos.mediaDiaria, calcularMediaDiaria(dados), 1);
}
function atualizarDestaque(nomeEl, qtdEl, resultado) {
    if (nomeEl) { nomeEl.textContent = resultado.nome; nomeEl.title = resultado.nome; }
    if (qtdEl) qtdEl.textContent = formatarQuantidadeMatriculas(resultado.quantidade);
}
function atualizarDestaques(dados) {
    atualizarDestaque(elementos.melhorVendedor, elementos.melhorVendedorQuantidade, obterMaiorOcorrencia(dados, "vendedor"));
    atualizarDestaque(elementos.cursoDestaque, elementos.cursoDestaqueQuantidade, obterMaiorOcorrencia(dados, "curso"));
}
function atualizarPeriodoExibido(periodo) {
    if (elementos.periodoExibicao) elementos.periodoExibicao.textContent = `${formatarDataBrasileira(periodo.inicio)} a ${formatarDataBrasileira(periodo.fim)}`;
}

function atualizarComparativoPeriodo(periodo) {
    const duracao = Math.round((periodo.fim - periodo.inicio) / 86400000) + 1;
    const fimAnterior = new Date(periodo.inicio); fimAnterior.setDate(fimAnterior.getDate() - 1); fimAnterior.setHours(23,59,59,999);
    const inicioAnterior = new Date(fimAnterior); inicioAnterior.setDate(inicioAnterior.getDate() - duracao + 1); inicioAnterior.setHours(0,0,0,0);
    const polo = elementos.filtroPolo?.value || "";
    const vendedor = elementos.filtroConsultor?.value || "";
    const anterior = dadosOriginais.filter(r => registroEstaNoPeriodo(r, inicioAnterior, fimAnterior) && (!polo || r.polo === polo) && (!vendedor || r.vendedor === vendedor)).length;
    const atual = dadosFiltrados.length;
    const variacao = anterior === 0 ? (atual > 0 ? 100 : 0) : ((atual - anterior) / anterior) * 100;
    if (elementos.comparativoSemana) {
        elementos.comparativoSemana.textContent = `${variacao > 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
        elementos.comparativoSemana.className = variacao > 0 ? "positivo" : variacao < 0 ? "negativo" : "neutro";
    }
    if (elementos.comparativoDescricao) elementos.comparativoDescricao.textContent = `${atual} no período • ${anterior} no período anterior`;
}

function calcularResumoFinanceiro(dados, campo) {
    return dados.reduce((resumo, registro) => { const valor = Number(registro[campo]) || 0; resumo.valor += valor; if (valor > 0) resumo.quantidade++; return resumo; }, { valor: 0, quantidade: 0 });
}
function atualizarResumoFinanceiro() {
    const itens = [
        ["boleto", elementos.faturamentoBoleto, elementos.quantidadeBoleto, "venda", "vendas"],
        ["cartaoAvista", elementos.faturamentoCartao, elementos.quantidadeCartao, "venda", "vendas"],
        ["taxaMatricula", elementos.faturamentoTaxa, elementos.quantidadeTaxa, "taxa", "taxas"]
    ];
    itens.forEach(([campo, valorEl, qtdEl, singular, plural]) => {
        const resumo = calcularResumoFinanceiro(dadosFiltrados, campo);
        if (valorEl) valorEl.textContent = formatarMoeda(resumo.valor);
        if (qtdEl) qtdEl.textContent = `${resumo.quantidade} ${resumo.quantidade === 1 ? singular : plural}`;
    });
}

function chartDisponivel() { return typeof Chart !== "undefined"; }
function destruirGrafico(grafico) { if (grafico?.destroy) grafico.destroy(); }
function obterCoresGrafico() { return { principal: "#1f82ff", texto: "#ffffff", grade: "rgba(255,255,255,.16)" }; }
function obterPaletaCategorias() { return ["#1f82ff", "#26d995", "#ff7400", "#8b5cf6", "#ff5f68", "#00a8cc", "#ec4899", "#84cc16"]; }
function exibirGraficoSemDados(canvasId, texto) {
    const canvas = document.getElementById(canvasId); if (!canvas?.parentElement) return;
    let msg = canvas.parentElement.querySelector(".grafico-sem-dados");
    if (!msg) { msg = document.createElement("div"); msg.className = "grafico-sem-dados"; canvas.parentElement.appendChild(msg); }
    msg.textContent = texto; msg.hidden = false; canvas.hidden = true;
}
function ocultarGraficoSemDados(canvasId) {
    const canvas = document.getElementById(canvasId); if (!canvas?.parentElement) return;
    const msg = canvas.parentElement.querySelector(".grafico-sem-dados"); if (msg) msg.hidden = true; canvas.hidden = false;
}

function criarGraficoRanking(dados) {
    if (!chartDisponivel()) return;
    const canvas = document.getElementById("graficoVendedores"); if (!canvas) return;
    destruirGrafico(graficoRanking);
    const ranking = Object.entries(contarOcorrencias(dados, "vendedor")).map(([nome, quantidade]) => ({ nome, quantidade })).sort((a,b) => b.quantidade-a.quantidade).slice(0,10);
    if (!ranking.length) { graficoRanking = null; exibirGraficoSemDados("graficoVendedores", "Nenhuma matrícula encontrada."); return; }
    ocultarGraficoSemDados("graficoVendedores"); const c = obterCoresGrafico();
    graficoRanking = new Chart(canvas, { type:"bar", data:{ labels:ranking.map(i=>i.nome), datasets:[{ data:ranking.map(i=>i.quantidade), backgroundColor:c.principal, borderRadius:7, maxBarThickness:28 }] }, options:{ responsive:true, maintainAspectRatio:false, indexAxis:"y", plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true,ticks:{precision:0,color:c.texto},grid:{color:c.grade}},y:{ticks:{color:c.texto},grid:{display:false}}} } });
}

function prepararEvolucaoDiaria(dados, periodo) {
    const mapa = new Map();
    dados.forEach(r => { const chave = obterChaveData(r.data); mapa.set(chave, (mapa.get(chave)||0)+1); });
    const labels=[], valores=[]; const cursor = new Date(periodo.inicio); cursor.setHours(0,0,0,0); const fim = new Date(periodo.fim); fim.setHours(0,0,0,0);
    while (cursor <= fim) { labels.push(formatarDataCurta(cursor)); valores.push(mapa.get(obterChaveData(cursor)) || 0); cursor.setDate(cursor.getDate()+1); }
    return { labels, valores };
}
function criarGraficoEvolucao(dados, periodo) {
    if (!chartDisponivel()) return; const canvas = document.getElementById("graficoEvolucao"); if (!canvas) return;
    destruirGrafico(graficoEvolucao); const ev = prepararEvolucaoDiaria(dados, periodo); ocultarGraficoSemDados("graficoEvolucao"); const c=obterCoresGrafico();
    graficoEvolucao = new Chart(canvas, { type:"line", data:{labels:ev.labels,datasets:[{data:ev.valores,borderColor:c.principal,backgroundColor:"rgba(31,130,255,.16)",borderWidth:3,fill:true,tension:.3,pointRadius:3,pointBackgroundColor:"#fff"}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:c.texto,maxTicksLimit:16},grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0,color:c.texto},grid:{color:c.grade}}}} });
}
function criarGraficoCursos(dados) {
    if (!chartDisponivel()) return; const canvas=document.getElementById("graficoCursos"); if(!canvas)return; destruirGrafico(graficoCursos);
    let cursos=Object.entries(contarOcorrencias(dados,"curso")).map(([nome,quantidade])=>({nome,quantidade})).sort((a,b)=>b.quantidade-a.quantidade);
    if(cursos.length>7){const outros=cursos.slice(7).reduce((s,i)=>s+i.quantidade,0);cursos=[...cursos.slice(0,7),{nome:"Outros",quantidade:outros}];}
    if(!cursos.length){graficoCursos=null;exibirGraficoSemDados("graficoCursos","Nenhum curso encontrado.");return;} ocultarGraficoSemDados("graficoCursos"); const paleta=obterPaletaCategorias();
    graficoCursos=new Chart(canvas,{type:"doughnut",data:{labels:cursos.map(i=>i.nome),datasets:[{data:cursos.map(i=>i.quantidade),backgroundColor:cursos.map((_,i)=>paleta[i%paleta.length]),borderColor:"#fff",borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:"65%",plugins:{legend:{position:"bottom",labels:{color:"#fff",usePointStyle:true,padding:12}}}}});
}

function aplicarFiltros() {
    const periodo = obterPeriodoSelecionado();
    const polo = elementos.filtroPolo?.value || "";
    const consultor = elementos.filtroConsultor?.value || "";
    dadosFiltrados = dadosOriginais.filter(r => registroEstaNoPeriodo(r, periodo.inicio, periodo.fim) && (!polo || r.polo === polo) && (!consultor || r.vendedor === consultor));
    atualizarPeriodoExibido(periodo); atualizarIndicadores(dadosFiltrados); atualizarResumoFinanceiro(); atualizarDestaques(dadosFiltrados); atualizarComparativoPeriodo(periodo);
    criarGraficoRanking(dadosFiltrados); criarGraficoEvolucao(dadosFiltrados, periodo); criarGraficoCursos(dadosFiltrados);
    const descricao = [polo && `polo ${polo}`, consultor && `consultor ${consultor}`].filter(Boolean).join(" e ");
    exibirMensagem(`${formatarNumero(dadosFiltrados.length)} matrículas encontradas${descricao ? ` para ${descricao}` : ""}.`, "sucesso");
}

function limparFiltros() {
    if (elementos.filtroDataInicio) elementos.filtroDataInicio.value = "";
    if (elementos.filtroDataFim) elementos.filtroDataFim.value = "";
    if (elementos.filtroPolo) elementos.filtroPolo.value = "";
    if (elementos.filtroConsultor) elementos.filtroConsultor.value = "";
    configurarFiltrosIniciais(); aplicarFiltros();
}

async function atualizarDashboard() {
    definirEstadoCarregamento(true);
    try { await carregarDados(); }
    catch (erro) { console.error(erro); exibirMensagem(`Não foi possível carregar os dados: ${erro.message}`, "erro"); }
    finally { definirEstadoCarregamento(false); }
}

[elementos.filtroDataInicio, elementos.filtroDataFim, elementos.filtroPolo, elementos.filtroConsultor].forEach(el => el?.addEventListener("change", aplicarFiltros));
elementos.btnLimparFiltros?.addEventListener("click", limparFiltros);
elementos.btnAtualizar?.addEventListener("click", atualizarDashboard);
document.addEventListener("DOMContentLoaded", atualizarDashboard);

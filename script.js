/* ==========================================================
   DASHBOARD COMERCIAL UNIFAHE
   Unidade Central
========================================================== */

const CONFIG = {
    unidade: "Unidade Central",
    campos: {
        data: "1",
        vendedor: "3",
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

/* ==========================================================
   ELEMENTOS DO HTML
========================================================== */

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
    quantidadeTaxa: document.getElementById("quantidadeTaxa")
};

/* ==========================================================
   UTILITÁRIOS
========================================================== */

function limparTexto(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return String(valor).trim();
}

function converterData(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }

    const texto = String(valor).trim();

    if (texto.toUpperCase().includes("DATA") || texto === "-") {
        return null;
    }

    function criarDataLocal(ano, mes, dia) {
        const data = new Date(
            Number(ano),
            Number(mes) - 1,
            Number(dia),
            12,
            0,
            0,
            0
        );

        if (
            Number.isNaN(data.getTime()) ||
            data.getFullYear() !== Number(ano) ||
            data.getMonth() !== Number(mes) - 1 ||
            data.getDate() !== Number(dia)
        ) {
            return null;
        }

        return data;
    }

    const formatoIso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (formatoIso) {
        return criarDataLocal(formatoIso[1], formatoIso[2], formatoIso[3]);
    }

    const formatoBarras = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (formatoBarras) {
        const primeiraParte = Number(formatoBarras[1]);
        const segundaParte = Number(formatoBarras[2]);
        const ano = Number(formatoBarras[3]);

        let dia;
        let mes;

        if (segundaParte > 12) {
            mes = primeiraParte;
            dia = segundaParte;
        } else if (primeiraParte > 12) {
            dia = primeiraParte;
            mes = segundaParte;
        } else {
            mes = primeiraParte;
            dia = segundaParte;
        }

        return criarDataLocal(ano, mes, dia);
    }

    const serial = Number(texto);

    if (Number.isFinite(serial) && serial >= 20000 && serial <= 80000) {
        const dataUTC = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);

        return criarDataLocal(
            dataUTC.getUTCFullYear(),
            dataUTC.getUTCMonth() + 1,
            dataUTC.getUTCDate()
        );
    }

    return null;
}

function converterValorMonetario(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }

    let texto = String(valor)
        .trim()
        .replace(/\s/g, "")
        .replace(/R\$/gi, "");

    if (!texto) {
        return 0;
    }

    if (texto.includes(".") && texto.includes(",")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
}

function inicioSemana(data) {
    const copia = new Date(data);
    const dia = copia.getDay();
    const diferenca = dia === 0 ? -6 : 1 - dia;

    copia.setDate(copia.getDate() + diferenca);
    copia.setHours(0, 0, 0, 0);

    return copia;
}

function fimSemana(data) {
    const fim = inicioSemana(data);

    fim.setDate(fim.getDate() + 6);
    fim.setHours(23, 59, 59, 999);

    return fim;
}

function obterPeriodoSelecionado() {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const datasDisponiveis = dadosOriginais
        .map((registro) => registro.data)
        .filter((data) =>
            data instanceof Date &&
            !Number.isNaN(data.getTime()) &&
            data <= hoje
        )
        .sort((dataA, dataB) => dataB - dataA);

    const dataReferencia = datasDisponiveis.length > 0
        ? datasDisponiveis[0]
        : hoje;

    return {
        inicio: inicioSemana(dataReferencia),
        fim: fimSemana(dataReferencia)
    };
}

function obterSemanaAnterior() {
    const periodoAtual = obterPeriodoSelecionado();

    const inicio = new Date(periodoAtual.inicio);
    const fim = new Date(periodoAtual.fim);

    inicio.setDate(inicio.getDate() - 7);
    fim.setDate(fim.getDate() - 7);

    return { inicio, fim };
}

function formatarDataBrasileira(data) {
    if (!data || Number.isNaN(data.getTime())) {
        return "—";
    }

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatarDataCurta(data) {
    if (!data || Number.isNaN(data.getTime())) {
        return "—";
    }

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
    });
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
}

function formatarQuantidadeMatriculas(quantidade) {
    return `${quantidade} ${quantidade === 1 ? "matrícula" : "matrículas"}`;
}

function datasSaoIguais(dataA, dataB) {
    if (!dataA || !dataB) {
        return false;
    }

    return (
        dataA.getFullYear() === dataB.getFullYear() &&
        dataA.getMonth() === dataB.getMonth() &&
        dataA.getDate() === dataB.getDate()
    );
}

function registroEstaNoPeriodo(registro, inicio, fim) {
    return Boolean(
        registro.data &&
        registro.data >= inicio &&
        registro.data <= fim
    );
}

function contarOcorrencias(dados, campo) {
    return dados.reduce((resultado, registro) => {
        const valor = limparTexto(registro[campo]);

        if (valor) {
            resultado[valor] = (resultado[valor] || 0) + 1;
        }

        return resultado;
    }, {});
}

function contarValoresUnicos(dados, campo) {
    return new Set(
        dados
            .map((registro) => limparTexto(registro[campo]))
            .filter(Boolean)
    ).size;
}

function obterMaiorOcorrencia(dados, campo) {
    const ranking = Object.entries(contarOcorrencias(dados, campo))
        .sort((itemA, itemB) => itemB[1] - itemA[1]);

    if (ranking.length === 0) {
        return {
            nome: "—",
            quantidade: 0
        };
    }

    return {
        nome: ranking[0][0],
        quantidade: ranking[0][1]
    };
}

/* ==========================================================
   MENSAGENS E CARREGAMENTO
========================================================== */

function exibirMensagem(texto, tipo = "normal") {
    if (!elementos.mensagemStatus || !elementos.textoMensagemStatus) {
        return;
    }

    elementos.textoMensagemStatus.textContent = texto;
    elementos.mensagemStatus.classList.remove("erro", "sucesso");

    if (tipo === "erro" || tipo === "sucesso") {
        elementos.mensagemStatus.classList.add(tipo);
    }

    elementos.mensagemStatus.classList.add("visivel");
}

function definirEstadoCarregamento(estaCarregando) {
    if (!elementos.btnAtualizar) {
        return;
    }

    const icone = elementos.btnAtualizar.querySelector("i");

    elementos.btnAtualizar.disabled = estaCarregando;
    elementos.btnAtualizar.classList.toggle("carregando", estaCarregando);

    if (estaCarregando) {
        elementos.btnAtualizar.setAttribute("aria-busy", "true");
    } else {
        elementos.btnAtualizar.removeAttribute("aria-busy");
    }

    if (icone) {
        icone.classList.toggle("icone-girando", estaCarregando);
    }
}

function atualizarHorario() {
    if (!elementos.ultimaAtualizacao) {
        return;
    }

    elementos.ultimaAtualizacao.textContent = new Date().toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

/* ==========================================================
   CARREGAMENTO DA API
========================================================== */

async function carregarDados() {
    try {
        if (typeof API_URL === "undefined") {
            throw new Error("A constante API_URL não foi encontrada no api.js.");
        }

        const resposta = await fetch(API_URL, {
            method: "GET",
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const json = await resposta.json();

        if (!Array.isArray(json)) {
            throw new Error("A API não retornou uma lista válida.");
        }

        dadosOriginais = json
            .map((registro) => ({
                data: converterData(registro[CONFIG.campos.data]),
                vendedor: limparTexto(registro[CONFIG.campos.vendedor]),
                curso: limparTexto(registro[CONFIG.campos.curso]),
                boleto: converterValorMonetario(registro[CONFIG.campos.boleto]),
                cartaoAvista: converterValorMonetario(
                    registro[CONFIG.campos.cartaoAvista]
                ),
                taxaMatricula: converterValorMonetario(
                    registro[CONFIG.campos.taxaMatricula]
                )
            }))
            .filter((registro) => {
                const possuiDataValida =
                    registro.data instanceof Date &&
                    !Number.isNaN(registro.data.getTime());

                const pareceCabecalho =
                    registro.vendedor.toUpperCase().includes("VENDEDOR") ||
                    registro.curso.toUpperCase().includes("CURSO");

                return possuiDataValida && !pareceCabecalho;
            });

        aplicarFiltros();
        atualizarHorario();

        console.log("Dados carregados:", dadosOriginais);
    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);

        exibirMensagem(
            "Não foi possível carregar os dados. Verifique a conexão com a API.",
            "erro"
        );
    }
}

/* ==========================================================
   INDICADORES
========================================================== */

function animarNumero(elemento, valorFinal, casasDecimais = 0) {
    if (!elemento) {
        return;
    }

    const valorNumerico = Number(valorFinal) || 0;
    const duracao = 600;
    const inicio = performance.now();

    function executar(tempoAtual) {
        const progresso = Math.min((tempoAtual - inicio) / duracao, 1);
        const valorAtual = valorNumerico * progresso;

        elemento.textContent = valorAtual.toLocaleString("pt-BR", {
            minimumFractionDigits: casasDecimais,
            maximumFractionDigits: casasDecimais
        });

        if (progresso < 1) {
            requestAnimationFrame(executar);
        }
    }

    requestAnimationFrame(executar);
}

function contarMatriculasHoje(dados) {
    const hoje = new Date();

    return dados.filter((registro) =>
        datasSaoIguais(registro.data, hoje)
    ).length;
}

function obterDiasDecorridosSemana(periodo) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    if (hoje < periodo.inicio) {
        return 0;
    }

    const dataFinal = hoje < periodo.fim
        ? hoje
        : new Date(periodo.fim);

    const milissegundosDia = 1000 * 60 * 60 * 24;
    const diferenca = dataFinal.getTime() - periodo.inicio.getTime();

    return Math.floor(diferenca / milissegundosDia) + 1;
}

function calcularMediaDiaria(dados, periodo) {
    const diasDecorridos = obterDiasDecorridosSemana(periodo);

    return diasDecorridos > 0
        ? dados.length / diasDecorridos
        : 0;
}

function atualizarIndicadores(dados, periodo) {
    animarNumero(elementos.totalMatriculas, dados.length);
    animarNumero(elementos.matriculasHoje, contarMatriculasHoje(dados));
    animarNumero(
        elementos.vendedoresAtivos,
        contarValoresUnicos(dados, "vendedor")
    );
    animarNumero(
        elementos.mediaDiaria,
        calcularMediaDiaria(dados, periodo),
        1
    );
}

function atualizarDestaque(elementoNome, elementoQuantidade, resultado) {
    if (elementoNome) {
        elementoNome.textContent = resultado.nome;
        elementoNome.title = resultado.nome;
    }

    if (elementoQuantidade) {
        elementoQuantidade.textContent =
            formatarQuantidadeMatriculas(resultado.quantidade);
    }
}

function atualizarDestaques(dados) {
    atualizarDestaque(
        elementos.melhorVendedor,
        elementos.melhorVendedorQuantidade,
        obterMaiorOcorrencia(dados, "vendedor")
    );

    atualizarDestaque(
        elementos.cursoDestaque,
        elementos.cursoDestaqueQuantidade,
        obterMaiorOcorrencia(dados, "curso")
    );
}

function atualizarPeriodoExibido(periodo) {
    if (!elementos.periodoExibicao) {
        return;
    }

    elementos.periodoExibicao.textContent =
        `${formatarDataBrasileira(periodo.inicio)} a ` +
        `${formatarDataBrasileira(periodo.fim)}`;
}

/* ==========================================================
   COMPARAÇÃO SEMANAL
========================================================== */

function obterDadosSemanaAnterior() {
    const periodo = obterSemanaAnterior();

    return dadosOriginais.filter((registro) =>
        registroEstaNoPeriodo(registro, periodo.inicio, periodo.fim)
    );
}

function calcularVariacaoPercentual(atual, anterior) {
    if (atual === 0 && anterior === 0) {
        return 0;
    }

    if (anterior === 0) {
        return atual > 0 ? 100 : 0;
    }

    return ((atual - anterior) / anterior) * 100;
}

function atualizarComparativoSemana() {
    if (!elementos.comparativoSemana) {
        return;
    }

    const totalAtual = dadosFiltrados.length;
    const totalAnterior = obterDadosSemanaAnterior().length;
    const variacao = calcularVariacaoPercentual(totalAtual, totalAnterior);
    const sinal = variacao > 0 ? "+" : "";

    elementos.comparativoSemana.textContent =
        `${sinal}${variacao.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}%`;

    elementos.comparativoSemana.classList.remove(
        "positivo",
        "negativo",
        "neutro"
    );

    elementos.comparativoSemana.classList.add(
        variacao > 0
            ? "positivo"
            : variacao < 0
                ? "negativo"
                : "neutro"
    );

    if (elementos.comparativoDescricao) {
        elementos.comparativoDescricao.textContent =
            `${formatarNumero(totalAtual)} nesta semana • ` +
            `${formatarNumero(totalAnterior)} na semana anterior`;
    }
}

/* ==========================================================
   CONTROLE DOS GRÁFICOS
========================================================== */

function chartDisponivel() {
    if (typeof Chart === "undefined") {
        console.error("A biblioteca Chart.js não foi encontrada.");
        return false;
    }

    return true;
}

function destruirGrafico(grafico) {
    if (grafico && typeof grafico.destroy === "function") {
        grafico.destroy();
    }
}

function obterCoresGrafico() {
    return {
        principal: "#1f82ff",
        texto: "#ffffff",
        grade: "rgba(255, 255, 255, 0.16)"
    };
}

function obterPaletaCategorias() {
    return [
        "#1f82ff",
        "#26d995",
        "#ff7400",
        "#8b5cf6",
        "#ff5f68",
        "#00a8cc",
        "#ec4899",
        "#84cc16"
    ];
}

function exibirGraficoSemDados(canvasId, texto) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || !canvas.parentElement) {
        return;
    }

    const container = canvas.parentElement;
    let mensagem = container.querySelector(".grafico-sem-dados");

    if (!mensagem) {
        mensagem = document.createElement("div");
        mensagem.className = "grafico-sem-dados";
        container.appendChild(mensagem);
    }

    mensagem.textContent = texto;
    mensagem.hidden = false;
    canvas.hidden = true;
}

function ocultarGraficoSemDados(canvasId) {
    const canvas = document.getElementById(canvasId);

    if (!canvas || !canvas.parentElement) {
        return;
    }

    const mensagem =
        canvas.parentElement.querySelector(".grafico-sem-dados");

    if (mensagem) {
        mensagem.hidden = true;
    }

    canvas.hidden = false;
}

/* ==========================================================
   GRÁFICO: RANKING DE VENDEDORES
========================================================== */

function prepararRankingVendedores(dados) {
    return Object.entries(contarOcorrencias(dados, "vendedor"))
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((itemA, itemB) => itemB.quantidade - itemA.quantidade)
        .slice(0, 10);
}

function criarGraficoRanking(dados) {
    if (!chartDisponivel()) {
        return;
    }

    const canvas = document.getElementById("graficoVendedores");

    if (!canvas) {
        return;
    }

    destruirGrafico(graficoRanking);

    const ranking = prepararRankingVendedores(dados);

    if (ranking.length === 0) {
        graficoRanking = null;

        exibirGraficoSemDados(
            "graficoVendedores",
            "Nenhuma matrícula encontrada para o ranking."
        );

        return;
    }

    ocultarGraficoSemDados("graficoVendedores");

    const cores = obterCoresGrafico();

    graficoRanking = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: ranking.map((item) => item.nome),
            datasets: [{
                label: "Matrículas",
                data: ranking.map((item) => item.quantidade),
                backgroundColor: cores.principal,
                borderColor: cores.principal,
                borderWidth: 1,
                borderRadius: 7,
                borderSkipped: false,
                maxBarThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label(contexto) {
                            return formatarQuantidadeMatriculas(contexto.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: cores.texto
                    },
                    grid: {
                        color: cores.grade
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: cores.texto,
                        callback(valor) {
                            const texto = this.getLabelForValue(valor);
                            return texto.length > 24
                                ? `${texto.slice(0, 24)}…`
                                : texto;
                        }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

/* ==========================================================
   GRÁFICO: EVOLUÇÃO DIÁRIA
========================================================== */

function obterDiasDaSemana(periodo) {
    const dias = [];

    for (let indice = 0; indice < 7; indice += 1) {
        const data = new Date(periodo.inicio);
        data.setDate(data.getDate() + indice);
        data.setHours(0, 0, 0, 0);
        dias.push(data);
    }

    return dias;
}

function obterIndiceDiaSemana(data) {
    const dia = data.getDay();
    return dia === 0 ? 6 : dia - 1;
}

function prepararEvolucaoDiaria(dados, periodo) {
    const dias = obterDiasDaSemana(periodo);
    const valores = new Array(7).fill(0);
    const nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    dados.forEach((registro) => {
        if (registro.data) {
            valores[obterIndiceDiaSemana(registro.data)] += 1;
        }
    });

    return {
        labels: dias.map(
            (data, indice) => `${nomes[indice]} ${formatarDataCurta(data)}`
        ),
        valores
    };
}

function criarGraficoEvolucao(dados, periodo) {
    if (!chartDisponivel()) {
        return;
    }

    const canvas = document.getElementById("graficoEvolucao");

    if (!canvas) {
        return;
    }

    destruirGrafico(graficoEvolucao);

    const evolucao = prepararEvolucaoDiaria(dados, periodo);
    const contexto = canvas.getContext("2d");
    const cores = obterCoresGrafico();

    const gradiente = contexto.createLinearGradient(
        0,
        0,
        0,
        canvas.clientHeight || 300
    );

    gradiente.addColorStop(0, "rgba(31, 130, 255, 0.32)");
    gradiente.addColorStop(1, "rgba(31, 130, 255, 0.02)");

    ocultarGraficoSemDados("graficoEvolucao");

    graficoEvolucao = new Chart(contexto, {
        type: "line",
        data: {
            labels: evolucao.labels,
            datasets: [{
                label: "Matrículas",
                data: evolucao.valores,
                borderColor: cores.principal,
                backgroundColor: gradiente,
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: cores.principal,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label(contextoTooltip) {
                            return formatarQuantidadeMatriculas(
                                contextoTooltip.raw
                            );
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: cores.texto
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: cores.texto
                    },
                    grid: {
                        color: cores.grade
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

/* ==========================================================
   GRÁFICO: CURSOS
========================================================== */

function prepararDistribuicaoCursos(dados) {
    return Object.entries(contarOcorrencias(dados, "curso"))
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((itemA, itemB) => itemB.quantidade - itemA.quantidade);
}

function agruparCursosMenores(cursos, limite = 7) {
    if (cursos.length <= limite) {
        return cursos;
    }

    const principais = cursos.slice(0, limite);
    const totalOutros = cursos
        .slice(limite)
        .reduce((total, item) => total + item.quantidade, 0);

    return [
        ...principais,
        {
            nome: "Outros",
            quantidade: totalOutros
        }
    ];
}

function criarGraficoCursos(dados) {
    if (!chartDisponivel()) {
        return;
    }

    const canvas = document.getElementById("graficoCursos");

    if (!canvas) {
        return;
    }

    destruirGrafico(graficoCursos);

    const cursos = agruparCursosMenores(
        prepararDistribuicaoCursos(dados)
    );

    if (cursos.length === 0) {
        graficoCursos = null;

        exibirGraficoSemDados(
            "graficoCursos",
            "Nenhum curso encontrado no período."
        );

        return;
    }

    ocultarGraficoSemDados("graficoCursos");

    const paleta = obterPaletaCategorias();

    graficoCursos = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: cursos.map((item) => item.nome),
            datasets: [{
                data: cursos.map((item) => item.quantidade),
                backgroundColor: cursos.map(
                    (_, indice) => paleta[indice % paleta.length]
                ),
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 16,
                        color: "#ffffff"
                    }
                },
                tooltip: {
                    callbacks: {
                        label(contextoTooltip) {
                            const valor = Number(contextoTooltip.raw) || 0;
                            const total = contextoTooltip.dataset.data.reduce(
                                (soma, item) => soma + Number(item || 0),
                                0
                            );
                            const percentual =
                                total > 0 ? (valor / total) * 100 : 0;

                            return (
                                `${contextoTooltip.label}: ` +
                                `${formatarQuantidadeMatriculas(valor)} ` +
                                `(${percentual.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                })}%)`
                            );
                        }
                    }
                }
            }
        }
    });
}

/* ==========================================================
   RESUMO FINANCEIRO
========================================================== */

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function calcularResumoFinanceiro(dados, campo) {
    return dados.reduce(
        (resumo, registro) => {
            const valor = Number(registro[campo]) || 0;
            resumo.valor += valor;

            if (valor > 0) {
                resumo.quantidade += 1;
            }

            return resumo;
        },
        { valor: 0, quantidade: 0 }
    );
}

function atualizarResumoFinanceiro() {
    const boleto = calcularResumoFinanceiro(dadosFiltrados, "boleto");
    const cartao = calcularResumoFinanceiro(dadosFiltrados, "cartaoAvista");
    const taxa = calcularResumoFinanceiro(dadosFiltrados, "taxaMatricula");

    if (elementos.faturamentoBoleto) {
        elementos.faturamentoBoleto.textContent = formatarMoeda(boleto.valor);
    }

    if (elementos.quantidadeBoleto) {
        elementos.quantidadeBoleto.textContent =
            `${boleto.quantidade} ${boleto.quantidade === 1 ? "venda" : "vendas"}`;
    }

    if (elementos.faturamentoCartao) {
        elementos.faturamentoCartao.textContent = formatarMoeda(cartao.valor);
    }

    if (elementos.quantidadeCartao) {
        elementos.quantidadeCartao.textContent =
            `${cartao.quantidade} ${cartao.quantidade === 1 ? "venda" : "vendas"}`;
    }

    if (elementos.faturamentoTaxa) {
        elementos.faturamentoTaxa.textContent = formatarMoeda(taxa.valor);
    }

    if (elementos.quantidadeTaxa) {
        elementos.quantidadeTaxa.textContent =
            `${taxa.quantidade} ${taxa.quantidade === 1 ? "taxa" : "taxas"}`;
    }
}

/* ==========================================================
   APLICAÇÃO DOS DADOS
========================================================== */

function aplicarFiltros() {
    const periodo = obterPeriodoSelecionado();

    dadosFiltrados = dadosOriginais.filter((registro) =>
        registroEstaNoPeriodo(registro, periodo.inicio, periodo.fim)
    );

    atualizarPeriodoExibido(periodo);
    atualizarIndicadores(dadosFiltrados, periodo);
    atualizarResumoFinanceiro();
    atualizarDestaques(dadosFiltrados);
    atualizarComparativoSemana();

    criarGraficoRanking(dadosFiltrados);
    criarGraficoEvolucao(dadosFiltrados, periodo);
    criarGraficoCursos(dadosFiltrados);

    exibirMensagem(
        `${formatarNumero(dadosFiltrados.length)} matrículas ` +
        "encontradas na semana atual.",
        "sucesso"
    );
}

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

async function atualizarDashboard() {
    definirEstadoCarregamento(true);

    try {
        await carregarDados();
    } finally {
        definirEstadoCarregamento(false);
    }
}

if (elementos.btnAtualizar) {
    elementos.btnAtualizar.addEventListener("click", atualizarDashboard);
}

document.addEventListener("DOMContentLoaded", atualizarDashboard);

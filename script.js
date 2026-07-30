/* ==========================================================
   DASHBOARD COMERCIAL UNIFAHE
   VERSÃO 1.0
   Desenvolvido por Natan Santos
========================================================== */


/* ==========================================================
   CONFIGURAÇÕES GERAIS
========================================================== */

const CONFIG = {

    unidade: "Unidade Central",

    periodoPadrao: "semana",

    campos: {

        data: "1",

        vendedor: "3",

        polo: "4",

        curso: "12"

    }

};


/* ==========================================================
   VARIÁVEIS GLOBAIS
========================================================== */

let dadosOriginais = [];

let dadosFiltrados = [];

let graficoRanking = null;

let graficoEvolucao = null;

let graficoCursos = null;

   /* ==========================================================
   ELEMENTOS DO HTML
========================================================== */

const elementos = {

    totalMatriculas:
        document.getElementById("totalMatriculas"),

    matriculasHoje:
        document.getElementById("matriculasHoje"),

    vendedoresAtivos:
        document.getElementById("totalVendedores"),

    mediaDiaria:
        document.getElementById("mediaDiaria"),

    melhorVendedor:
        document.getElementById("melhorVendedor"),

    melhorVendedorQuantidade:
        document.getElementById("melhorVendedorQuantidade"),

    cursoDestaque:
        document.getElementById("cursoDestaque"),

    cursoDestaqueQuantidade:
        document.getElementById("cursoDestaqueQuantidade"),

    ultimaAtualizacao:
        document.getElementById("ultimaAtualizacao"),

    btnAtualizar:
        document.getElementById("btnAtualizar"),

    periodoExibicao:
        document.getElementById("periodoAnalisado"),

    comparativoSemana:
        document.getElementById("variacaoSemanal"),

    comparativoDescricao:
        document.getElementById("variacaoSemanalDetalhe"),

    mensagemStatus:
        document.getElementById("mensagemStatus"),

    textoMensagemStatus:
        document.getElementById("textoMensagemStatus")

};

   /* ==========================================================
   LIMPEZA DE TEXTOS
========================================================== */

function limparTexto(valor){

    if(valor === null || valor === undefined){

        return "";

    }

    return String(valor).trim();

}


/* ==========================================================
   CONVERSÃO DE DATAS
========================================================== */

function converterData(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const texto = String(valor).trim();

    /*
        Ignora cabeçalhos da planilha.
    */
    if (
        texto.toUpperCase().includes("DATA") ||
        texto === "-"
    ) {
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

        if (Number.isNaN(data.getTime())) {
            return null;
        }

        if (
            data.getFullYear() !== Number(ano) ||
            data.getMonth() !== Number(mes) - 1 ||
            data.getDate() !== Number(dia)
        ) {
            return null;
        }

        return data;
    }

    /*
        Formato ISO:
        2026-07-29
        2026-07-29T03:00:00.000Z
    */
    const formatoIso = texto.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

    if (formatoIso) {

        return criarDataLocal(
            formatoIso[1],
            formatoIso[2],
            formatoIso[3]
        );
    }

    /*
        Formatos com barras:

        Americano:
        6/29/2026
        07/30/2026

        Brasileiro:
        29/06/2026
        30/07/2026
    */
    const formatoBarras = texto.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (formatoBarras) {

        const primeiraParte =
            Number(formatoBarras[1]);

        const segundaParte =
            Number(formatoBarras[2]);

        const ano =
            Number(formatoBarras[3]);

        let dia;
        let mes;

        /*
            Se a segunda parte for maior que 12,
            obrigatoriamente é mês/dia/ano.

            Exemplo:
            6/29/2026
        */
        if (segundaParte > 12) {

            mes = primeiraParte;
            dia = segundaParte;

        /*
            Se a primeira parte for maior que 12,
            obrigatoriamente é dia/mês/ano.

            Exemplo:
            29/06/2026
        */
        } else if (primeiraParte > 12) {

            dia = primeiraParte;
            mes = segundaParte;

        } else {

            /*
                Quando os dois valores são menores
                ou iguais a 12, adotamos o padrão
                americano utilizado pela API.
            */

            mes = primeiraParte;
            dia = segundaParte;
        }

        return criarDataLocal(
            ano,
            mes,
            dia
        );
    }

    /*
        Número serial do Excel/Sheets.
    */
    const serial = Number(texto);

    if (
        Number.isFinite(serial) &&
        serial >= 20000 &&
        serial <= 80000
    ) {

        const dataUTC = new Date(
            Date.UTC(1899, 11, 30) +
            serial * 86400000
        );

        return criarDataLocal(
            dataUTC.getUTCFullYear(),
            dataUTC.getUTCMonth() + 1,
            dataUTC.getUTCDate()
        );
    }

    return null;
}


/* ==========================================================
   CONTROLE DA SEMANA
========================================================== */

function fimSemana(data){

    const inicio = inicioSemana(data);

    inicio.setDate(
        inicio.getDate() + 6
    );

    inicio.setHours(
        23,
        59,
        59,
        999
    );

    return inicio;

}


async function carregarDados() {

    try {

        if (typeof API_URL === "undefined") {
            throw new Error(
                "A constante API_URL não foi encontrada no api.js."
            );
        }

        const resposta = await fetch(API_URL, {
            method: "GET",
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP ${resposta.status}`
            );
        }

        const json = await resposta.json();

        console.log(
            "Primeiro registro bruto:",
            json[0]
        );

        console.table(
            json.slice(0, 20).map((registro, indice) => ({
                linha: indice + 1,
                campo1: registro["1"],
                tipoCampo1: typeof registro["1"],
                convertido: converterData(
                    registro["1"]
                )
            }))
        );

        if (!Array.isArray(json)) {
            throw new Error(
                "A API não retornou uma lista válida."
            );
        }

        dadosOriginais = json
    .map((registro) => ({
        data: converterData(
            registro[CONFIG.campos.data]
        ),

        vendedor: limparTexto(
            registro[CONFIG.campos.vendedor]
        ),

        curso: limparTexto(
            registro[CONFIG.campos.curso]
        )
    }))
    .filter((registro) => {

        const possuiDataValida =
            registro.data instanceof Date &&
            !Number.isNaN(
                registro.data.getTime()
            );

        const pareceCabecalho =
            registro.vendedor
                .toUpperCase()
                .includes("VENDEDOR") ||

            registro.curso
                .toUpperCase()
                .includes("CURSO");

        return (
            possuiDataValida &&
            !pareceCabecalho
        );
    });

console.log(
    dadosOriginais
        .map(r => ({
            data: formatarDataBrasileira(r.data)
        }))
        .sort((a, b) => {

            const da = a.data.split("/").reverse().join("");
            const db = b.data.split("/").reverse().join("");

            return da.localeCompare(db);

        })
);

console.table(
    dadosOriginais
        .filter((registro) => {
            if (!registro.data) {
                return false;
            }

            return (
                registro.data >= new Date(2026, 6, 20) &&
                registro.data <= new Date(2026, 7, 10, 23, 59, 59)
            );
        })
        .sort((a, b) => a.data - b.data)
        .map((registro) => ({
            data: formatarDataBrasileira(registro.data),
            dataCompleta: registro.data,
            vendedor: registro.vendedor,
            curso: registro.curso
        }))
);
        aplicarFiltros();

        atualizarHorario();

        console.log(
            "Dados carregados:",
            dadosOriginais
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar dados:",
            erro
        );

        exibirMensagem(
            "Não foi possível carregar os dados. Verifique a conexão com a API.",
            "erro"
        );

    }

}



/* ==========================================================
   CONFIGURAÇÕES GERAIS DOS GRÁFICOS
========================================================== */

/* ==========================================================
   CONTROLE DO PERÍODO
========================================================== */


/*
    Retorna a semana atual.

    Segunda-feira às 00:00
    até domingo às 23:59.
*/
function inicioSemana(data) {

    const copia = new Date(data);

    const dia = copia.getDay();

    const diferenca =
        dia === 0
            ? -6
            : 1 - dia;

    copia.setDate(
        copia.getDate() + diferenca
    );

    copia.setHours(
        0,
        0,
        0,
        0
    );

    return copia;

}


function fimSemana(data) {

    const fim = inicioSemana(data);

    fim.setDate(
        fim.getDate() + 6
    );

    fim.setHours(
        23,
        59,
        59,
        999
    );

    return fim;

}

function obterPeriodoSelecionado() {

    const hoje = new Date();

    hoje.setHours(
        23,
        59,
        59,
        999
    );

    /*
        Seleciona apenas datas válidas
        que não estejam no futuro.
    */
    const datasDisponiveis = dadosOriginais
        .map((registro) => registro.data)
        .filter((data) =>
            data instanceof Date &&
            !Number.isNaN(data.getTime()) &&
            data <= hoje
        )
        .sort((dataA, dataB) =>
            dataB - dataA
        );

    /*
        Caso não existam dados válidos,
        utiliza a semana atual.
    */
    const dataReferencia =
        datasDisponiveis.length > 0
            ? datasDisponiveis[0]
            : hoje;

    console.log(
        "Data usada como referência:",
        dataReferencia
    );

    return {
        inicio: inicioSemana(dataReferencia),
        fim: fimSemana(dataReferencia)
    };
}


/*
    Retorna o período completo
    da semana anterior.
*/

function obterSemanaAnterior(){

    const periodoAtual =

        obterPeriodoSelecionado();


    const inicio =

        new Date(

            periodoAtual.inicio

        );


    inicio.setDate(

        inicio.getDate() - 7

    );


    const fim =

        new Date(

            periodoAtual.fim

        );


    fim.setDate(

        fim.getDate() - 7

    );


    return {

        inicio: inicio,

        fim: fim

    };

}


/* ==========================================================
   FORMATAÇÃO DE DATAS
========================================================== */


/*
    Formata uma data no padrão:

    29/07/2026
*/

function formatarDataBrasileira(data){

    if(

        !data

        ||

        Number.isNaN(

            data.getTime()

        )

    ){

        return "—";

    }


    return data.toLocaleDateString(

        "pt-BR",

        {

            day: "2-digit",

            month: "2-digit",

            year: "numeric"

        }

    );

}


/*
    Formata uma data no padrão:

    29/07
*/

function formatarDataCurta(data){

    if(

        !data

        ||

        Number.isNaN(

            data.getTime()

        )

    ){

        return "—";

    }


    return data.toLocaleDateString(

        "pt-BR",

        {

            day: "2-digit",

            month: "2-digit"

        }

    );

}


/*
    Formata números inteiros
    no padrão brasileiro.
*/

function formatarNumero(valor){

    return Number(

        valor || 0

    ).toLocaleString(

        "pt-BR"

    );

}


/*
    Compara duas datas sem considerar
    horas, minutos ou segundos.
*/

function datasSaoIguais(

    dataA,

    dataB

){

    if(!dataA || !dataB){

        return false;

    }


    return (

        dataA.getFullYear()

        ===

        dataB.getFullYear()

        &&

        dataA.getMonth()

        ===

        dataB.getMonth()

        &&

        dataA.getDate()

        ===

        dataB.getDate()

    );

}


/* ==========================================================
   VERIFICAÇÃO DE PERÍODO
========================================================== */


/*
    Verifica se a matrícula está
    dentro do período informado.
*/

function registroEstaNoPeriodo(

    registro,

    inicio,

    fim

){

    if(!registro.data){

        return false;

    }


    return (

        registro.data >= inicio

        &&

        registro.data <= fim

    );

}


/* ==========================================================
   CONTAGEM DE OCORRÊNCIAS
========================================================== */


/*
    Conta quantas vezes cada valor
    aparece em determinado campo.

    Exemplo:

    {
        "Maria": 12,
        "João": 8
    }
*/

function contarOcorrencias(

    dados,

    campo

){

    return dados.reduce(

        (

            resultado,

            registro

        ) => {


            const valor =

                registro[campo];


            if(!valor){

                return resultado;

            }


            resultado[valor] =

                (

                    resultado[valor]

                    ||

                    0

                )

                +

                1;


            return resultado;

        },

        {}

    );

}


/*
    Conta quantos valores diferentes
    existem em determinado campo.
*/

function contarValoresUnicos(

    dados,

    campo

){

    const valores =

        dados

            .map(

                registro =>

                    registro[campo]

            )

            .filter(Boolean);


    return new Set(

        valores

    ).size;

}


/* ==========================================================
   APLICAÇÃO DO PERÍODO
========================================================== */


function aplicarFiltros(){

    const periodo =

        obterPeriodoSelecionado();


    dadosFiltrados =

        dadosOriginais.filter(

            registro =>

                registroEstaNoPeriodo(

                    registro,

                    periodo.inicio,

                    periodo.fim

                )

        );


    atualizarPeriodoExibido(

        periodo

    );


    atualizarIndicadores(

        dadosFiltrados,

        periodo

    );


    atualizarDestaques(

        dadosFiltrados

    );


    atualizarComparativoSemana();


    criarGraficoRanking(

        dadosFiltrados

    );


    criarGraficoEvolucao(

        dadosFiltrados,

        periodo

    );


    criarGraficoCursos(

        dadosFiltrados

    );


    exibirMensagem(

        `${formatarNumero(
            dadosFiltrados.length
        )} matrículas encontradas na semana atual.`,

        "sucesso"

    );

}


/* ==========================================================
   PERÍODO EXIBIDO NO HTML
========================================================== */


function atualizarPeriodoExibido(

    periodo

){

    if(!elementos.periodoExibicao){

        return;

    }


    const inicio =

        formatarDataBrasileira(

            periodo.inicio

        );


    const fim =

        formatarDataBrasileira(

            periodo.fim

        );


    elementos.periodoExibicao.textContent =

        `${inicio} a ${fim}`;

}


/* ==========================================================
   MATRÍCULAS DE HOJE
========================================================== */


function contarMatriculasHoje(dados){

    const hoje = new Date();


    return dados.filter(

        registro =>

            datasSaoIguais(

                registro.data,

                hoje

            )

    ).length;

}


/* ==========================================================
   MÉDIA DIÁRIA
========================================================== */


/*
    A média será calculada considerando
    os dias transcorridos da semana.

    Exemplo:

    Se hoje for quarta-feira,
    divide o total por três dias.
*/

function obterDiasDecorridosSemana(

    periodo

){

    const hoje = new Date();


    hoje.setHours(

        23,

        59,

        59,

        999

    );


    if(hoje < periodo.inicio){

        return 0;

    }


    let dataFinal =

        new Date(

            periodo.fim

        );


    if(hoje < periodo.fim){

        dataFinal = hoje;

    }


    const milissegundosDia =

        1000

        *

        60

        *

        60

        *

        24;


    const diferenca =

        dataFinal.getTime()

        -

        periodo.inicio.getTime();


    return Math.floor(

        diferenca

        /

        milissegundosDia

    )

    +

    1;

}


function calcularMediaDiaria(

    dados,

    periodo

){

    const diasDecorridos =

        obterDiasDecorridosSemana(

            periodo

        );


    if(diasDecorridos <= 0){

        return 0;

    }


    return (

        dados.length

        /

        diasDecorridos

    );

}


/* ==========================================================
   ANIMAÇÃO DOS INDICADORES
========================================================== */


function animarNumero(

    elemento,

    valorFinal,

    casasDecimais = 0

){

    if(!elemento){

        return;

    }


    const valorNumerico =

        Number(valorFinal) || 0;


    const duracao = 600;


    const inicio =

        performance.now();


    function executar(

        tempoAtual

    ){

        const progresso =

            Math.min(

                (

                    tempoAtual

                    -

                    inicio

                )

                /

                duracao,

                1

            );


        const valorAtual =

            valorNumerico

            *

            progresso;


        elemento.textContent =

            valorAtual.toLocaleString(

                "pt-BR",

                {

                    minimumFractionDigits:

                        casasDecimais,

                    maximumFractionDigits:

                        casasDecimais

                }

            );


        if(progresso < 1){

            requestAnimationFrame(

                executar

            );

        }

    }


    requestAnimationFrame(

        executar

    );

}


/* ==========================================================
   INDICADORES PRINCIPAIS
========================================================== */


function atualizarIndicadores(

    dados,

    periodo

){

    const total =

        dados.length;


    const totalHoje =

        contarMatriculasHoje(

            dados

        );


    const vendedoresAtivos =

        contarValoresUnicos(

            dados,

            "vendedor"

        );


    const media =

        calcularMediaDiaria(

            dados,

            periodo

        );


    animarNumero(

        elementos.totalMatriculas,

        total

    );


    animarNumero(

        elementos.matriculasHoje,

        totalHoje

    );


    animarNumero(

        elementos.vendedoresAtivos,

        vendedoresAtivos

    );


    animarNumero(

        elementos.mediaDiaria,

        media,

        1

    );

}


/* ==========================================================
   MAIOR OCORRÊNCIA
========================================================== */


function obterMaiorOcorrencia(

    dados,

    campo

){

    const contagem =

        contarOcorrencias(

            dados,

            campo

        );


    const ranking =

        Object.entries(

            contagem

        )

        .sort(

            (

                itemA,

                itemB

            ) =>

                itemB[1]

                -

                itemA[1]

        );


    if(ranking.length === 0){

        return {

            nome: "—",

            quantidade: 0

        };

    }


    return {

        nome:

            ranking[0][0],

        quantidade:

            ranking[0][1]

    };

}


/* ==========================================================
   DESTAQUES
========================================================== */


function atualizarDestaque(

    elementoNome,

    elementoQuantidade,

    resultado

){

    if(elementoNome){

        elementoNome.textContent =

            resultado.nome;


        elementoNome.title =

            resultado.nome;

    }


    if(elementoQuantidade){

        const textoQuantidade =

            resultado.quantidade === 1

            ?

            "matrícula"

            :

            "matrículas";


        elementoQuantidade.textContent =

            `${resultado.quantidade} ${textoQuantidade}`;

    }

}


function atualizarDestaques(dados){

    const vendedorDestaque =

        obterMaiorOcorrencia(

            dados,

            "vendedor"

        );


    const cursoDestaque =

        obterMaiorOcorrencia(

            dados,

            "curso"

        );


    atualizarDestaque(

        elementos.melhorVendedor,

        elementos.melhorVendedorQuantidade,

        vendedorDestaque

    );


    atualizarDestaque(

        elementos.cursoDestaque,

        elementos.cursoDestaqueQuantidade,

        cursoDestaque

    );

}


/* ==========================================================
   COMPARAÇÃO COM A SEMANA ANTERIOR
========================================================== */


function obterDadosSemanaAnterior(){

    const periodo =

        obterSemanaAnterior();


    return dadosOriginais.filter(

        registro =>

            registroEstaNoPeriodo(

                registro,

                periodo.inicio,

                periodo.fim

            )

    );

}


/*
    Calcula a diferença percentual
    entre a semana atual e a anterior.
*/

function calcularVariacaoPercentual(

    atual,

    anterior

){

    if(

        atual === 0

        &&

        anterior === 0

    ){

        return 0;

    }


    if(

        anterior === 0

        &&

        atual > 0

    ){

        return 100;

    }


    return (

        (

            atual

            -

            anterior

        )

        /

        anterior

    )

    *

    100;

}


function atualizarComparativoSemana(){

    if(!elementos.comparativoSemana){

        return;

    }


    const dadosAnteriores =

        obterDadosSemanaAnterior();


    const totalAtual =

        dadosFiltrados.length;


    const totalAnterior =

        dadosAnteriores.length;


    const variacao =

        calcularVariacaoPercentual(

            totalAtual,

            totalAnterior

        );


    const sinal =

        variacao > 0

        ?

        "+"

        :

        "";


    elementos.comparativoSemana.textContent =

        `${sinal}${variacao.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }
        )}%`;


    elementos.comparativoSemana.classList.remove(

        "positivo",

        "negativo",

        "neutro"

    );


    if(variacao > 0){

        elementos.comparativoSemana.classList.add(

            "positivo"

        );

    }

    else if(variacao < 0){

        elementos.comparativoSemana.classList.add(

            "negativo"

        );

    }

    else{

        elementos.comparativoSemana.classList.add(

            "neutro"

        );

    }


    if(elementos.comparativoDescricao){

        elementos.comparativoDescricao.textContent =

            `${formatarNumero(
                totalAtual
            )} nesta semana • `

            +

            `${formatarNumero(
                totalAnterior
            )} na semana anterior`;

    }

}


/* ==========================================================
   ÚLTIMA ATUALIZAÇÃO
========================================================== */


function atualizarHorario(){

    if(!elementos.ultimaAtualizacao){

        return;

    }


    elementos.ultimaAtualizacao.textContent =

        new Date().toLocaleString(

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
   MENSAGEM DE STATUS
========================================================== */


function exibirMensagem(

    texto,

    tipo = "normal"

){

    if(

        !elementos.mensagemStatus

        ||

        !elementos.textoMensagemStatus

    ){

        return;

    }


    elementos.textoMensagemStatus.textContent =

        texto;


    elementos.mensagemStatus.classList.remove(

        "erro",

        "sucesso"

    );


    if(tipo === "erro"){

        elementos.mensagemStatus.classList.add(

            "erro"

        );

    }


    if(tipo === "sucesso"){

        elementos.mensagemStatus.classList.add(

            "sucesso"

        );

    }


    elementos.mensagemStatus.classList.add(

        "visivel"

    );

}

/*
    Verifica se a biblioteca Chart.js
    foi carregada corretamente.
*/

function chartDisponivel(){

    if(typeof Chart === "undefined"){

        console.error(

            "A biblioteca Chart.js não foi encontrada."

        );

        return false;

    }


    return true;

}


/*
    Retorna as cores utilizadas
    nos gráficos do dashboard.
*/

function obterCoresGrafico(){

    return {

        principal: "#1f5eff",

        secundaria: "#6c8cff",

        destaque: "#15b87a",

        alerta: "#f5a623",

        perigo: "#e8505b",

        texto: "#5b6475",

        grade: "rgba(148, 163, 184, 0.18)",

        fundoPrincipal: "rgba(31, 94, 255, 0.18)",

        fundoSecundario: "rgba(108, 140, 255, 0.18)"

    };

}


/*
    Retorna uma lista de cores
    para gráficos com várias categorias.
*/

function obterPaletaCategorias(){

    return [

        "#1f5eff",

        "#15b87a",

        "#f5a623",

        "#8b5cf6",

        "#e8505b",

        "#00a8cc",

        "#ec4899",

        "#64748b",

        "#84cc16",

        "#f97316",

        "#14b8a6",

        "#6366f1"

    ];

}


/*
    Destrói um gráfico existente
    antes de criar uma nova versão.
*/

function destruirGrafico(grafico){

    if(

        grafico

        &&

        typeof grafico.destroy === "function"

    ){

        grafico.destroy();

    }

}


/* ==========================================================
   MENSAGEM PARA GRÁFICOS SEM DADOS
========================================================== */


/*
    Exibe uma mensagem no lugar
    do gráfico quando não existem dados.
*/

function exibirGraficoSemDados(

    canvasId,

    texto = "Nenhum dado encontrado"

){

    const canvas =

        document.getElementById(canvasId);


    if(!canvas){

        return;

    }


    const container =

        canvas.parentElement;


    if(!container){

        return;

    }


    let mensagem =

        container.querySelector(

            ".grafico-sem-dados"

        );


    if(!mensagem){

        mensagem =

            document.createElement("div");


        mensagem.className =

            "grafico-sem-dados";


        container.appendChild(

            mensagem

        );

    }


    mensagem.textContent = texto;

    mensagem.hidden = false;

    canvas.hidden = true;

}


/*
    Remove a mensagem de ausência
    de dados e mostra o canvas.
*/

function ocultarGraficoSemDados(canvasId){

    const canvas =

        document.getElementById(canvasId);


    if(!canvas){

        return;

    }


    const container =

        canvas.parentElement;


    const mensagem =

        container?.querySelector(

            ".grafico-sem-dados"

        );


    if(mensagem){

        mensagem.hidden = true;

    }


    canvas.hidden = false;

}


/* ==========================================================
   FORMATAÇÃO DE TOOLTIP
========================================================== */


/*
    Retorna a palavra correta:

    1 matrícula
    2 matrículas
*/

function formatarQuantidadeMatriculas(

    quantidade

){

    const descricao =

        quantidade === 1

        ? "matrícula"

        : "matrículas";


    return `${quantidade} ${descricao}`;

}


/* ==========================================================
   PREPARAÇÃO DO RANKING DE VENDEDORES
========================================================== */

function prepararRankingVendedores(dados){

    const contagem =

        contarOcorrencias(

            dados,

            "vendedor"

        );


    return Object.entries(contagem)

        .map(([nome, quantidade]) => {

            return {

                nome: nome,

                quantidade: quantidade

            };

        })

        .sort(

            (itemA, itemB) =>

                itemB.quantidade

                -

                itemA.quantidade

        );

}


/*
    Limita o ranking aos vendedores
    com maior número de matrículas.
*/

function limitarRanking(

    ranking,

    limite = 10

){

    return ranking.slice(

        0,

        limite

    );

}


/* ==========================================================
   GRÁFICO DE RANKING DOS VENDEDORES
========================================================== */

function criarGraficoRanking(dados){

    if(!chartDisponivel()){

        return;

    }


    const canvas =

        document.getElementById(

            "graficoVendedores"

        );


    if(!canvas){

        console.warn(

            "Canvas graficoVendedores não encontrado."

        );

        return;

    }


    destruirGrafico(

        graficoRanking

    );


    const ranking =

        limitarRanking(

            prepararRankingVendedores(

                dados

            ),

            10

        );


    if(ranking.length === 0){

        graficoRanking = null;


        exibirGraficoSemDados(

            "graficoVendedores",

            "Nenhuma matrícula encontrada para o ranking."

        );


        return;

    }


    ocultarGraficoSemDados(

        "graficoVendedores"

    );


    const cores =

        obterCoresGrafico();


    const contexto =

        canvas.getContext("2d");


    graficoRanking = new Chart(

        contexto,

        {

            type: "bar",

            data: {

                labels:

                    ranking.map(

                        item => item.nome

                    ),

                datasets: [

                    {

                        label: "Matrículas",

                        data:

                            ranking.map(

                                item =>

                                    item.quantidade

                            ),

                        backgroundColor:

                            cores.principal,

                        borderColor:

                            cores.principal,

                        borderWidth: 1,

                        borderRadius: 7,

                        borderSkipped: false,

                        barThickness: 22,

                        maxBarThickness: 28

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                indexAxis: "y",

                animation: {

                    duration: 700,

                    easing: "easeOutQuart"

                },

                interaction: {

                    mode: "nearest",

                    intersect: false

                },

                plugins: {

                    legend: {

                        display: false

                    },

                    tooltip: {

                        displayColors: false,

                        callbacks: {

                            title: function(

                                itens

                            ){

                                return itens[0]

                                    ?.label

                                    || "";

                            },

                            label: function(

                                contextoTooltip

                            ){

                                return formatarQuantidadeMatriculas(

                                    contextoTooltip.raw

                                );

                            }

                        }

                    }

                },

                scales: {

                    x: {

                        beginAtZero: true,

                        ticks: {

                            precision: 0,

                            color:

                                cores.texto

                        },

                        grid: {

                            color:

                                cores.grade,

                            drawBorder: false

                        },

                        border: {

                            display: false

                        }

                    },

                    y: {

                        ticks: {

                            color:

                                cores.texto,

                            font: {

                                size: 12,

                                weight: "500"

                            },

                            callback: function(

                                valor

                            ){

                                const texto =

                                    this.getLabelForValue(

                                        valor

                                    );


                                if(

                                    texto.length

                                    >

                                    24

                                ){

                                    return (

                                        texto.slice(

                                            0,

                                            24

                                        )

                                        +

                                        "…"

                                    );

                                }


                                return texto;

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

        }

    );

}


/* ==========================================================
   DIAS DA SEMANA
========================================================== */

function obterDiasDaSemana(periodo){

    if(

        !periodo

        ||

        !periodo.inicio

    ){

        return [];

    }


    const dias = [];


    for(

        let indice = 0;

        indice < 7;

        indice++

    ){

        const data =

            new Date(

                periodo.inicio

            );


        data.setDate(

            data.getDate()

            +

            indice

        );


        data.setHours(

            0,

            0,

            0,

            0

        );


        dias.push(data);

    }


    return dias;

}


/*
    Retorna o índice da semana:

    segunda = 0
    terça = 1
    quarta = 2
    quinta = 3
    sexta = 4
    sábado = 5
    domingo = 6
*/

function obterIndiceDiaSemana(data){

    const dia = data.getDay();


    return dia === 0

        ? 6

        : dia - 1;

}


/* ==========================================================
   DADOS DA EVOLUÇÃO DIÁRIA
========================================================== */

function prepararEvolucaoDiaria(

    dados,

    periodo

){

    const dias =

        obterDiasDaSemana(periodo);


    const valores =

        new Array(7).fill(0);


    dados.forEach(registro => {

        if(!registro.data){

            return;

        }


        const indice =

            obterIndiceDiaSemana(

                registro.data

            );


        valores[indice] += 1;

    });


    return {

        dias: dias,

        labels: dias.map(

            (data, indice) => {

                const nomes = [

                    "Seg",

                    "Ter",

                    "Qua",

                    "Qui",

                    "Sex",

                    "Sáb",

                    "Dom"

                ];


                return (

                    `${nomes[indice]} `

                    +

                    formatarDataCurta(

                        data

                    )

                );

            }

        ),

        valores: valores

    };

}


/* ==========================================================
   GRÁFICO DE EVOLUÇÃO DIÁRIA
========================================================== */

function criarGraficoEvolucao(

    dados,

    periodo

){

    if(!chartDisponivel()){

        return;

    }


    const canvas =

        document.getElementById(

            "graficoEvolucao"

        );


    if(!canvas){

        console.warn(

            "Canvas graficoEvolucao não encontrado."

        );

        return;

    }


    destruirGrafico(

        graficoEvolucao

    );


    const evolucao =

        prepararEvolucaoDiaria(

            dados,

            periodo

        );


    ocultarGraficoSemDados(

        "graficoEvolucao"

    );


    const contexto =

        canvas.getContext("2d");


    const cores =

        obterCoresGrafico();


    const gradiente =

        contexto.createLinearGradient(

            0,

            0,

            0,

            canvas.clientHeight || 300

        );


    gradiente.addColorStop(

        0,

        "rgba(31, 94, 255, 0.30)"

    );


    gradiente.addColorStop(

        1,

        "rgba(31, 94, 255, 0.02)"

    );


    graficoEvolucao = new Chart(

        contexto,

        {

            type: "line",

            data: {

                labels:

                    evolucao.labels,

                datasets: [

                    {

                        label: "Matrículas",

                        data:

                            evolucao.valores,

                        borderColor:

                            cores.principal,

                        backgroundColor:

                            gradiente,

                        borderWidth: 3,

                        fill: true,

                        tension: 0.35,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        pointBackgroundColor:

                            "#ffffff",

                        pointBorderColor:

                            cores.principal,

                        pointBorderWidth: 2

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {

                    duration: 700,

                    easing: "easeOutQuart"

                },

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

                            label: function(

                                contextoTooltip

                            ){

                                return formatarQuantidadeMatriculas(

                                    contextoTooltip.raw

                                );

                            }

                        }

                    }

                },

                scales: {

                    x: {

                        grid: {

                            display: false

                        },

                        ticks: {

                            color:

                                cores.texto,

                            font: {

                                size: 11

                            }

                        },

                        border: {

                            display: false

                        }

                    },

                    y: {

                        beginAtZero: true,

                        ticks: {

                            precision: 0,

                            color:

                                cores.texto

                        },

                        grid: {

                            color:

                                cores.grade

                        },

                        border: {

                            display: false

                        }

                    }

                }

            }

        }

    );

}


/* ==========================================================
   PREPARAÇÃO DOS CURSOS
========================================================== */

function prepararDistribuicaoCursos(dados){

    const contagem =

        contarOcorrencias(

            dados,

            "curso"

        );


    return Object.entries(contagem)

        .map(([nome, quantidade]) => {

            return {

                nome: nome,

                quantidade: quantidade

            };

        })

        .sort(

            (itemA, itemB) =>

                itemB.quantidade

                -

                itemA.quantidade

        );

}


/* ==========================================================
   AGRUPAMENTO DE CURSOS
========================================================== */


/*
    Exibe os sete maiores cursos
    e agrupa os demais como "Outros".
*/

function agruparCursosMenores(

    cursos,

    limite = 7

){

    if(cursos.length <= limite){

        return cursos;

    }


    const principais =

        cursos.slice(

            0,

            limite

        );


    const restantes =

        cursos.slice(

            limite

        );


    const totalOutros =

        restantes.reduce(

            (total, item) =>

                total

                +

                item.quantidade,

            0

        );


    principais.push({

        nome: "Outros",

        quantidade: totalOutros

    });


    return principais;

}


/* ==========================================================
   GRÁFICO DE DISTRIBUIÇÃO POR CURSO
========================================================== */

function criarGraficoCursos(dados){

    if(!chartDisponivel()){

        return;

    }


    const canvas =

        document.getElementById(

            "graficoCursos"

        );


    if(!canvas){

        console.warn(

            "Canvas graficoCursos não encontrado."

        );

        return;

    }


    destruirGrafico(

        graficoCursos

    );


    const cursos =

        agruparCursosMenores(

            prepararDistribuicaoCursos(

                dados

            )

        );


    if(cursos.length === 0){

        graficoCursos = null;


        exibirGraficoSemDados(

            "graficoCursos",

            "Nenhum curso encontrado no período."

        );


        return;

    }


    ocultarGraficoSemDados(

        "graficoCursos"

    );


    const contexto =

        canvas.getContext("2d");


    const paleta =

        obterPaletaCategorias();


    graficoCursos = new Chart(

        contexto,

        {

            type: "doughnut",

            data: {

                labels:

                    cursos.map(

                        item => item.nome

                    ),

                datasets: [

                    {

                        data:

                            cursos.map(

                                item =>

                                    item.quantidade

                            ),

                        backgroundColor:

                            cursos.map(

                                (_, indice) =>

                                    paleta[

                                        indice

                                        %

                                        paleta.length

                                    ]

                            ),

                        borderColor:

                            "#ffffff",

                        borderWidth: 3,

                        hoverOffset: 8

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "65%",

                animation: {

                    duration: 750,

                    easing: "easeOutQuart"

                },

                plugins: {

                    legend: {

                        position: "bottom",

                        labels: {

                            usePointStyle: true,

                            pointStyle: "circle",

                            boxWidth: 8,

                            boxHeight: 8,

                            padding: 16,

                            color: "#5b6475",

                            font: {

                                size: 11

                            },

                            generateLabels: function(

                                grafico

                            ){

                                const dadosGrafico =

                                    grafico.data;


                                return dadosGrafico.labels.map(

                                    (label, indice) => {

                                        const valor =

                                            dadosGrafico.datasets[0]

                                                .data[indice];


                                        return {

                                            text:

                                                `${label} (${valor})`,

                                            fillStyle:

                                                dadosGrafico.datasets[0]

                                                    .backgroundColor[indice],

                                            strokeStyle:

                                                dadosGrafico.datasets[0]

                                                    .backgroundColor[indice],

                                            pointStyle: "circle",

                                            hidden: false,

                                            index: indice

                                        };

                                    }

                                );

                            }

                        }

                    },

                    tooltip: {

                        callbacks: {

                            label: function(

                                contextoTooltip

                            ){

                                const valor =

                                    contextoTooltip.raw;


                                const total =

                                    contextoTooltip.dataset.data

                                        .reduce(

                                            (soma, item) =>

                                                soma + item,

                                            0

                                        );


                                const percentual =

                                    total > 0

                                    ?

                                    (

                                        valor

                                        /

                                        total

                                        *

                                        100

                                    )

                                    :

                                    0;


                                return (

                                    `${contextoTooltip.label}: `

                                    +

                                    `${valor} matrículas `

                                    +

                                    `(${percentual.toLocaleString(
                                        "pt-BR",
                                        {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1
                                        }
                                    )}%)`

                                );

                            }

                        }

                    }

                }

            }

        }

    );

}/* ==========================================================
   CONTROLE DO BOTÃO ATUALIZAR
========================================================== */

function definirEstadoCarregamento(estaCarregando){

    if(!elementos.btnAtualizar){

        return;

    }

    const icone =
        elementos.btnAtualizar.querySelector("i");

    elementos.btnAtualizar.disabled =
        estaCarregando;

    if(estaCarregando){

        elementos.btnAtualizar.classList.add(
            "carregando"
        );

        elementos.btnAtualizar.setAttribute(
            "aria-busy",
            "true"
        );

        if(icone){

            icone.classList.add(
                "icone-girando"
            );

        }

        return;

    }

    elementos.btnAtualizar.classList.remove(
        "carregando"
    );

    elementos.btnAtualizar.removeAttribute(
        "aria-busy"
    );

    if(icone){

        icone.classList.remove(
            "icone-girando"
        );

    }

}


/* ==========================================================
   ATUALIZAÇÃO MANUAL
========================================================== */

async function atualizarDashboard(){

    definirEstadoCarregamento(true);

    try{

        await carregarDados();

    }

    finally{

        definirEstadoCarregamento(false);

    }

}


/* ==========================================================
   EVENTOS
========================================================== */

if(elementos.btnAtualizar){

    elementos.btnAtualizar.addEventListener(

        "click",

        atualizarDashboard

    );

}


/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    atualizarDashboard

);
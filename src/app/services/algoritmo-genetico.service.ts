import { CromossomoSorterService } from './cromossomo-sorter.service';
import { Cromossomo } from './../entities/cromossomo';
import { RoletaService } from './roleta.service';
import { Injectable } from '@angular/core';
import { SorteadorService } from './../services/sorteador.service';
import { ArquivoEntradaService } from '../services/arquivo-entrada.service';
import { EntradaDados } from '../entities/entrada-dados';
import { Node } from '../entities/node';

@Injectable()
export class AlgoritmoGeneticoService {
    public melhorCromossomo: Cromossomo;
    private dadosEntrada: EntradaDados;
    private populacao: Cromossomo[];
    private cromossomoId: number = 1;

    constructor(private _arquivoEntrada: ArquivoEntradaService,
        private _sorter: SorteadorService,
        private _roleta: RoletaService,
        private _cromossomoSorter: CromossomoSorterService) { }

    public async prepararEntradaDeDados(dados: EntradaDados) {
        this.dadosEntrada = dados;
        await this._arquivoEntrada.carregarArquivo(dados.arquivo);
        this.populacao = this.popularCromossomos();
    }

    private popularCromossomos(): Array<Cromossomo> {
        let populacao = new Array<Cromossomo>()
        for (var i = 0; i < this.dadosEntrada.tamanhoPopulacao; i++) {
            let cidadesEmbaralhadas = this.embaralharCidades();
            let cromossomo = new Cromossomo(this.cromossomoId++, cidadesEmbaralhadas);

            populacao.push(cromossomo);
        }
        return populacao;
    }

    private verificarCromossomo(cromossomo: Cromossomo) {
        let ordinalNamers = cromossomo.individuos.map(x => x.ordinalName);
        for (var i = 0; i < cromossomo.individuos.length; i++) {
            if (ordinalNamers.indexOf(i) < 0)
                debugger;
        }
    }

    public gerarMelhorSolucaoDaGeracao() {
        let resultadoSelecaoNatural = this.selecaoNatural();
        // console.log(resultadoSelecaoNatural.map(function(x) {return {filhoUm: x.filhoUm.fitness, filhoDois: x.filhoDois.fitness}}))
        let filhos = this.crossover(resultadoSelecaoNatural);
        let filhosMutados = this.mutacao(filhos);
        this.elitismo(filhosMutados);

        this.melhorCromossomo = this.populacao[0];
        // this.verificarCromossomo(this.melhorCromossomo);
    }

    private elitismo(filhos: Cromossomo[]) {
        filhos.forEach((filho) => {
            this.populacao.push(filho);
        });
        this._cromossomoSorter.ordernar(this.populacao);
        this.populacao = this.populacao.splice(0, this.dadosEntrada.tamanhoPopulacao);
    }

    private embaralharCidades(): Array<Node> {
        let cidadesEmbaralhadas: Array<Node> = new Array<Node>();

        this._sorter.resetArray();
        for (var j = 0; j < this._arquivoEntrada.quantidadeDeCidades; j++) {
            let sorted = this._sorter.sort(this._arquivoEntrada.quantidadeDeCidades);
            cidadesEmbaralhadas.push(this._arquivoEntrada.cidades[sorted]);
        }
        return cidadesEmbaralhadas;
    }

    private selecaoNatural(): Array<ResultadoSelecaoNatural> {
        let populacaoAux = this.populacao.map(x => new Cromossomo(x.id, x.individuos));
        let tuplasDosFilhos: Array<ResultadoSelecaoNatural> = [];

        for (var i = 0; i < this.dadosEntrada.tamanhoPopulacao / 2; i++) {
            let primeiroFilho = this._roleta.melhor(populacaoAux);
            populacaoAux.splice(populacaoAux.indexOf(primeiroFilho), 1);

            let segundoFilho = this._roleta.melhor(populacaoAux);
            populacaoAux.splice(populacaoAux.indexOf(segundoFilho), 1);

            tuplasDosFilhos.push(new ResultadoSelecaoNatural(primeiroFilho, segundoFilho));
        }
        return tuplasDosFilhos;
    }

    private crossover(tuplas: Array<ResultadoSelecaoNatural>): Cromossomo[] {
        let filhos: Cromossomo[] = [];
        for (var i = 0; i < tuplas.length; i++) {
            this._sorter.resetArray();
            if (this._sorter.sort(101) > this.dadosEntrada.taxaCrossover)
                continue;

            var tupla = tuplas[i];
            let filho = this.gerarFilho(tupla);
            filhos.push(filho);
        }

        return filhos;
    }

    private mutacao(filhos: Cromossomo[]): Cromossomo[] {
        let filhosMutados: Cromossomo[] = [];

        for (var i = 0; i < filhos.length; i++) {
            this._sorter.resetArray();
            let filho = filhos[i];
            if (this._sorter.sort(101) > this.dadosEntrada.taxaMutacao) {
                this.MutarElemento(filho);
                this.MutarElemento(filho);
                this.MutarElemento(filho);
            }
            filhosMutados.push(filho);
        }
        return filhosMutados;
    }

    private MutarElemento(cromossomo: Cromossomo): Cromossomo {
        let elementoMutado = new Cromossomo(cromossomo.id, cromossomo.individuos);

        let i = this._sorter.sort(elementoMutado.individuos.length);
        let j = this._sorter.sort(elementoMutado.individuos.length);
        this.swapPosition(elementoMutado.individuos, i, j);

        return elementoMutado;
    }

    private swapPosition(array: any[], i: number, j: number) {
        let aux = array[i];
        array[i] = array[j];
        array[j] = aux;
    }

    private gerarFilho(tupla: ResultadoSelecaoNatural) {
        let mask = this.gerarMascara();
        let nodes = this.gerarAhPartirDaMascara(tupla, mask);
        this.completar(nodes);

        let cromossomo = new Cromossomo(this.cromossomoId++, nodes);
        // this.verificarCromossomo(cromossomo);
        return cromossomo
    }

    private gerarMascara() {
        let mask = [];
        for (var i = 0; i < this._arquivoEntrada.quantidadeDeCidades; i++) {
            this._sorter.resetArray();
            let random = this._sorter.sort(2);
            mask.push(random);
        }
        return mask;
    }

    private gerarAhPartirDaMascara(tupla: ResultadoSelecaoNatural, mask: any[]) {
        let nodes: Node[] = [];
        for (var i = 0; i < this._arquivoEntrada.quantidadeDeCidades; i++) {
            let left = tupla.filhoUm.individuos[i];
            let right = tupla.filhoDois.individuos[i];

            if (nodes.indexOf(left) > 0 && nodes.indexOf(right) > 0) {
                nodes.push(undefined);
                continue;
            }

            if (mask[i] == 0) {
                if (nodes.indexOf(left) < 0)
                    nodes.push(left);
                else
                    nodes.push(right);
            }

            if (mask[i] == 1) {
                if (nodes.indexOf(right) < 0)
                    nodes.push(right);
                else
                    nodes.push(left);
            }
        }
        return nodes;
    }

    private completar(nodes: Node[]) {
        for (var i = 0; i < nodes.length; i++) {
            if (!nodes[i] || nodes.filter(x => x && x.ordinalName == nodes[i].ordinalName).length > 1)
                nodes[i] = this.primeiroQueNaoExiste(nodes);
        }
    }

    private primeiroQueNaoExiste(nodes: Node[]) {
        for (var i = 0; i < this._arquivoEntrada.cidades.length; i++) {
            if (nodes.indexOf(this._arquivoEntrada.cidades[i]) < 0)
                return this._arquivoEntrada.cidades[i];
        }
    }

    private subistituir(best: Cromossomo) {
        let bigger = -1;
        let index = 0;
        for (var i = 0; i < this.dadosEntrada.tamanhoPopulacao; i++) {
            if (this.populacao[i].fitness > bigger) {
                index = i;
                bigger = this.populacao[i].fitness;
            }
        }
        if (index != -1)
            this.populacao[index] = best;
    }

    private pegarMelhorFitnes(): Cromossomo {
        let menor = this.populacao[0];
        for (var i = 0; i < this.dadosEntrada.tamanhoPopulacao; i++) {
            if (this.populacao[i] && this.populacao[i].fitness < menor.fitness)
                menor = this.populacao[i];
        }
        return menor;
    }
}

class ResultadoSelecaoNatural {
    constructor(public filhoUm: Cromossomo, public filhoDois: Cromossomo) { }
}

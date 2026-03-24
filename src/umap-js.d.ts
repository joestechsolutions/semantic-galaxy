declare module "umap-js" {
  export interface UMAPParameters {
    nComponents?: number;
    nNeighbors?: number;
    minDist?: number;
    spread?: number;
    nEpochs?: number;
    random?: () => number;
    distanceFn?: (a: number[], b: number[]) => number;
  }

  export class UMAP {
    constructor(params?: UMAPParameters);
    fit(data: number[][]): number[][];
    fitAsync(
      data: number[][],
      callback?: (epoch: number) => boolean | void,
    ): Promise<number[][]>;
    transform(toTransform: number[][]): number[][];
    getNEpochs(): number;
  }
}

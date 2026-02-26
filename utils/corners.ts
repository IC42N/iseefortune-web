export function fetchCorderByEpoch(epoch: number) {
    const lastNumber = Math.abs(epoch) % 10;
    return "c" + lastNumber + ".svg";
}


export function fetchCornerSVG(winningNumber: number | undefined) : string {
    return 'c4.svg';
    // if(winningNumber === undefined) return 'c4.svg';
    //
    // if(winningNumber === ) return 'c42.svg';
}
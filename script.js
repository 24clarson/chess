// ----------------------------------------
// ----------- Boring Logistics -----------
// ----------------------------------------


// Stop annoying image dragging
window.ondragstart = () => false;

// Populate squares
for (let i=21; i<99; i++) {
  if (i%10==0||i%10==9) { continue; }
  let square;
  if ((i%10+Math.floor(i/10))%2) {
    square = document.createElement("div");
    square.classList.add("light");
  } else {
    square = document.createElement("div");
    square.classList.add("dark");
  }
  square.id = "square" + i;
  square.classList.add("square");
  document.getElementById("chessboard").appendChild(square);
}

// Print board based on board representation
function print(brd, player=1) {
  let cbrd = [...brd];
  if (player == -1) { cbrd.reverse(); }
  const images = ["whitePawn.png","whiteKnight.png","whiteBishop.png","whiteRook.png","whiteKing.png","whiteQueen.png","blackPawn.png","blackKnight.png","blackBishop.png","blackRook.png","blackKing.png","blackQueen.png"];
  const representations = [1,2,3,5,8,9,-1,-2,-3,-5,-8,-9];
  for (let i=21; i<99; i++) {
    if (i%10==0||i%10==9) {
      continue;
    }
    incumbent = document.getElementById("piece"+i)
    if (incumbent) { incumbent.remove(); }
    const square = document.getElementById("square"+i);
    if (cbrd[i]) {
      const image = images[representations.indexOf(cbrd[i])];
      const piece = document.createElement("img");
      piece.setAttribute("src", "images/" + image);
      piece.setAttribute("width", "46");
      piece.classList.add("piece");
      piece.id = "piece" + i;
      square.appendChild(piece);
    }
  }
}

// Highlight selected square 
function select() {
  return new Promise(function(resolve) {
    function highlight(event) {
      document.removeEventListener("mousedown", highlight)
      const square = document.getElementById(event.target.id.replace("piece", "square"));
      if (square) {
        if (square.id == "undo") {
          resolve("undo");
          return;
        }
      }
      if (!square) {
        resolve(null);
        return;
      }
      if (!square.id.includes("square")) {
        resolve(null);
        return;
      }
      const squares = document.getElementsByClassName("square");
      for (let i=0; i<squares.length; i++) {
        const element = squares[i];
        if (element.classList.contains("highlighted")) {
          element.classList.remove("highlighted");
          resolve(square.id);
          return;
        }
      }
      square.classList.add("highlighted");
      resolve(square.id);
      return;
    }
    document.addEventListener("mousedown", highlight);
  });
}

// ----------------------------------------
// ------------ Actual Engine -------------
// ----------------------------------------

// Score adjustment for each piece based on position
let positional = {
  1 : [   0,  0,  0,  0,  0,  0,  0,  0,
        100,120,150,200,200,150,120,100,
         30, 40, 50, 70, 70, 50, 40, 30,
         20, 30, 40, 50, 50, 40, 30, 20,
         10, 20, 30, 40, 40, 30, 20, 10,
        -20,-10, 10, 20, 20, 10,-10,-20,
        -30,-20,-10,-10,-10,-10,-20,-30,
          0,  0,  0,  0,  0,  0,  0,  0],
  2 : [ -30,-20,-20,-20,-20,-20,-20,-30,
        -20,-10, 10, 15, 15, 10,-10,-20,
        -20,  0, 10, 10, 10, 10,  0,-20,
        -20,  0, 10, 20, 20, 10,  0,-20,
        -20,  0, 10, 20, 20, 10,  0,-20,
        -20,  0, 20, 10, 10, 20,  0,-20,
        -20,-10,  0, 15, 15,  0,-10,-20,
        -30,-20,-20,-20,-20,-20,-20,-30],
  3 : [ -30,-30,-30,-30,-30,-30,-30,-30,
        -30, 20,  0,  0,  0,  0, 20,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30, 20, 20, 25, 25, 20, 20,-30,
          0,  0, 30, 25, 25, 30,  0,  0,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30, 10,  0,  0,  0,  0, 10,-30,
        -30,-30,-30,-30,-30,-30,-30,-30],
  5 : [ -40,-30,-10, 20, 20,-10,-30,-40,
         20, 30, 40, 50, 50, 40, 30, 20,
        -20,  0,  5, 20, 20,  5,  0,-20,
        -20,  0,  5, 20, 20,  5,  0,-20,
        -20,  0,  5, 20, 20,  5,  0,-20,
        -20,  0,  0, 20, 20,  0,  0,-20,
        -30,  0,  0, 20, 20,  0,  0,-30,
        -10,  0,  5, 20, 20,  5,  0,-10],
  8 : [  50, 20,  0,-10,-10,  0, 20, 50,
         20,  0,-10,-20,-20,-10,  0, 20,
          0,-10,-40,-50,-50,-40,-10,  0,
        -10,-20,-50,-60,-60,-50,-20,-10,
        -10,-20,-50,-60,-60,-50,-20,-10,
          0,-10,-40,-50,-50,-40,-10,  0,
         20,  0,-10,-20,-20,-10,  0, 20,
         50, 50,  0,-10,-10,  0, 50, 50],
  9 : [ -40,-30,-30,-30,-30,-30,-30,-40,
        -30,-20,-10,-10,-10,-10,-20,-30,
        -30,-10, 20, 20, 20, 20,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 20, 20, 20, 20,-10,-30,
        -30,-20,-10,-10,-10,-10,-20,-30,
        -40,-30,-30,-30,-30,-30,-30,-40],
}
// Add borders and create mirrored versions for the opponent
for (let pc of [1,2,3,5,8,9]) {
  let temp = new Array(20).fill(0);
  for (let i=0; i<8; i++) {
    temp = temp.concat([0], positional[pc].slice(8*i,8*i+8), [0]);
  }
  temp = temp.concat(new Array(20).fill(0));
  positional[pc] = temp;
  temp = [];
  for (let i=11; 0<=i; i--) {
    temp = temp.concat(positional[pc].slice(10*i,10*(i+1)));
  }
  positional[pc*-1] = temp;
}

// Decide if it is an endgame
const threshold = 1300;

// Values of each piece
const values = {
  1 : 100,
  2 : 300,
  3 : 300,
  5 : 500,
  8 : 1e6,
  9 : 900
}

// All possible directions each piece can move.
const directions = {
  1 : [-10, -20, -11, -9],
  2 : [-21, -19, -12, -8, 8, 12, 19, 21],
  3 : [-11, -9, 9, 11],
  5 : [-10, -1, 1, 10],
  8 : [-11, -10, -9, -1, 1, 9, 10, 11],
  9 : [-11, -10, -9, -1, 1, 9, 10, 11]
}

// Initialize Zobrist hash seeds
let zobrist = new Array(20).fill(0);
for (let i=0; i<8; i++) {
  zobrist.push(0);
  let row = [];
  for (let j=0; j<8; j++) {
    let states = [];
    for (let k=0; k<12; k++) {
      states.push(Math.floor(Math.random()*1e14));
    }
    row.push(states);
  }
  zobrist = zobrist.concat(row);
  zobrist.push(0);
}
zobrist = zobrist.concat(new Array(20).fill(0));

// All the information about a board state.
class Position {
  constructor(brd, player, score, cast, ep, mat, hash, prev) {
    this.brd = brd;
    this.player = player;
    this.score = score;
    this.cast = cast;
    this.ep = ep;
    this.mat = mat;
    this.hash = hash;
    this.prev = prev;
  }
  legal() {
    const tp = this.player;
    const tb = this.brd;
    let moves = [];
    for (let i=21; i<99; i++) {
      const p = tp*tb[i];
      if (p<1||10<p) { continue; }
      for (let dir of directions[p]) {
        dir *= tp;
        for (let len=1; len<8; len++) {
          const j = i+dir*len;
          const q = tp*tb[j];
          if (0<q||10<-q) { break; }
          if (p==1) {
            if (dir%10!=0&&q==0&&j!=this.ep) { break; }
            if (dir%10==0&&q) { break; }
            if (dir%20==0&&(tb[i-tp*10]||(38<i&&i<81))) { break; }
          }
          if (this.update([i,j]).blank().check()) {
            if (p==1||p==2||p==8||q<0) { break; }
            continue;
          }
          moves.push([i,j]);
          if (p==1||p==2||p==8||q) { break; }
          if (p==5&&tp*tb[j+1]==8&&this.cast[(1-tp)/2][0]) {
            if (!this.check(j+1)&&!this.check(j)&&!this.check(j-1)) {
              moves.push([j+1,j-1]);
            }
          }
          if (p==5&&tp*tb[j-1]==8&&this.cast[(1-tp)/2][1]) {
            if (!this.check(j+1)&&!this.check(j)&&!this.check(j-1)) {
              moves.push([j-1,j+1]);
            }
          }
        }
      }
    }
    return moves;
  }
  *moves() {
    const tp = this.player;
    const tb = this.brd;
    for (let i=21; i<99; i++) {
      const p = tp*tb[i];
      if (p<1||10<p) { continue; }
      for (let dir of directions[p]) {
        dir *= tp;
        for (let len=1; len<8; len++) {
          const j = i+dir*len;
          const q = tp*tb[j];
          if (0<q||10<-q) { break; }
          if (p==1) {
            if (dir%10!=0&&q==0&&j!=this.ep) { break; }
            if (dir%10==0&&q) { break; }
            if (dir%20==0&&(tb[i-tp*10]||(38<i&&i<81))) { break; }
          }
          yield [i,j];
          if (p==1||p==2||p==8||q) { break; }
          if (p==5&&tp*tb[j+1]==8&&this.cast[(1-tp)/2][0]) {
            if (!this.check(j+1)&&!this.check(j)&&!this.check(j-1)) {
              yield [j+1,j-1];
            }
          }
          if (p==5&&tp*tb[j-1]==8&&this.cast[(1-tp)/2][1]) {
            if (!this.check(j+1)&&!this.check(j)&&!this.check(j-1)) {
              yield [j-1,j+1];
            }
          }
        }
      }
    }
  }
  captures() {
    const tp = this.player;
    const tb = this.brd;
    const captsort = {
      1600: 1,
      1400: 2,
      1200: 3,
      1000: 4,
      800: 5,
      600: 6,
      400: 7,
      200: 8,
      0: 9
    }
    let empty = true;
    let captures = [[],[],[],[],[],[],[],[],[],[],[]];
    for (let i=21; i<99; i++) {
      const p = tp*tb[i];
      if (p<1||10<p) { continue; }
      for (let dir of directions[p]) {
        dir *= tp;
        for (let len=1; len<8; len++) {
          const j = i+dir*len;
          const q = tp*tb[j];
          if (0<q||10<-q) { break; }
          if (p==1&&dir%10==0) { break; }
          if (!q) {
            if (p==1||p==2||p==8) { break; }
            continue;
          }
          empty = false;
          if (values[-q]-values[p]>1e5) {
            captures[0].push([i,j]);
          } else if (values[-q]-values[p]<-1e5) {
            captures[10].push([i,j]);
          } else {
            captures[captsort[800+values[-q]-values[p]]].push([i,j]);
          }
          if (p==1||p==2||p==8||q) { break; }
        }
      }
    }
    return empty?false:captures;
  }
  update(mv) {
    const tp = this.player;
    const i = mv[0];
    const j = mv[1];
    const p = tp*this.brd[i];
    const q = tp*this.brd[j];
    let cbrd = [...this.brd];
    let cscore = this.score;
    let ccast = [[...this.cast[0]],[...this.cast[1]]];
    let cep = 0;
    let cmat = [...this.mat];
    let chash = tp*this.hash;
    if (p==1&&j==this.ep) {
      cbrd[j+tp*10] = 0;
      cmat[(1+tp)/2] -= values[1];
      cscore += tp*values[1];
      cscore += tp*positional[-tp][j+tp*10];
      chash -= zobrist[j+tp*10][3+tp*3];
    }
    if (p==8&&i-j==2) {
      cbrd[j+1] = tp*5;
      cbrd[j-2] = 0;
      cscore += tp*positional[tp*5][j+1];
      cscore -= tp*positional[tp*5][j-2];
      chash += zobrist[j+1][6-tp*3];
      chash -= zobrist[j-2][6-tp*3];
    }
    if (p==8&&j-i==2) {
      cbrd[j-1] = tp*5;
      cbrd[j+1] = 0;
      cscore += tp*positional[tp*5][j-1];
      cscore -= tp*positional[tp*5][j+1];
      chash += zobrist[j-1][6-tp*3];
      chash -= zobrist[j+1][6-tp*3];
    }
    if (q<0) {
      cmat[(1+tp)/2] -= values[-q];
      cscore += tp*values[-q];
      cscore += tp*positional[-tp*q][j];
      chash -= zobrist[j][[1,2,3,5,8,9].indexOf(-q)+3+tp*3];
    }
    if (p==1&&(j<29||90<j)) {
      cbrd[j] = tp*9;
      cmat[(1-tp)/2] += values[9]-values[1];
      cscore += tp*(values[9]-values[1]);
      cscore += tp*positional[tp*9][j];
      chash += zobrist[j][8-tp*3];
    } else if (p==8&&cmat[(1+tp)/2]<threshold) {
      cbrd[j] = tp*8;
      cscore -= tp*positional[tp*8][j];
      chash += zobrist[j][7-tp*3];
    } else {
      cbrd[j] = tp*p;
      cscore += tp*positional[tp*p][j];
      chash += zobrist[j][[1,2,3,5,8,9].indexOf(p)+3-tp*3];
    }
    cbrd[i] = 0;
    chash -= zobrist[i][[1,2,3,5,8,9].indexOf(p)+3-tp*3]
    if (this.mat[(1+tp)/2]<threshold&&p==8) {
      cscore += tp*positional[tp*8][i];
    } else {
      cscore -= tp*positional[tp*p][i];
    }
    if (p==1&&i-j==tp*20) { cep=(i+j)/2; }
    if (tp*p==8||i==91||j==91) { ccast[0][0]=false; }
    if (tp*p==8||i==98||j==98) { ccast[0][1]=false; }
    if (tp*p==-8||i==21||j==21) { ccast[1][0]=false; }
    if (tp*p==-8||i==28||j==28) { ccast[1][1]=false; }
    return new Position(cbrd, -this.player, cscore, ccast, cep, cmat, -tp*chash, mv);
  }
  blank() {
    return new Position(this.brd, -this.player, this.score, this.cast, this.ep, this.mat, -this.hash, null);
  }
  check(king=this.brd.indexOf(this.player*8)) {
    const tp = this.player;
    const tb = this.brd;
    for (let dir of directions[3]) {
      for (let len=1; len<8; len++) {
        const p = -tp*tb[king+dir*len];
        if (p==3||p==9||(len==1&&p==8)) { return true; }
        if (p) { break; }
      }
    }
    for (let dir of directions[5]) {
      for (let len=1; len<8; len++) {
        const p = -tp*tb[king+dir*len];
        if (p==5||p==9||(len==1&&p==8)) { return true; }
        if (p) { break; }
      }
    }
    for (let dir of directions[2]) {
      if (tp*tb[king+dir]==-2) { return true; }
    }
    if (tb[king-tp*11]==-tp||tb[king-tp*9]==-tp) { return true; }
    return false;
  }
  endgame() {
    let cscore = this.mat[0]-this.mat[1];
    const wking = this.brd.indexOf(8);
    const bking = this.brd.indexOf(-8);
    const apart = (wking%10-bking%10+Math.floor(wking/10)-Math.floor(bking/10))**2;
    const wcent = (Math.min(wking%10-1,8-wking%10)+Math.min(Math.floor(wking/10)-2,9-Math.floor(wking/10)))**2;
    const bcent = (Math.min(bking%10-1,8-bking%10)+Math.min(Math.floor(bking/10)-2,9-Math.floor(bking/10)))**2;
    if (cscore>0) {
      cscore -= apart;
      cscore -= 3*bcent;
    } else {
      cscore += apart;
      cscore += 3*wcent;
    }
    return cscore;
  }
  structure(mv) {
    const tp = this.player;
    const tb = this.brd;
    const i = mv[0];
    const p = tp*tb[i];
    let cscore = 0;
    if (p==1&&(tb[i-10]==tp||tb[i+10]==tp)) {
      cscore -= tp*30;
    }
    return cscore;
  }
}

// Picks the moves for the computer.
class Engine {
  move(hst, limit) {
    const pos = hst[hst.length-1];
    this.repeats = {};
    for (let position of hst) {
      this.repeats[position.hash] = hst.reduce((p,c)=>(c.hash==position.hash)?p+1:p,0);
    }
    this.transpos = {};
    let evals = [];
    let moves = [pos.legal()];
    this.start = Date.now();
    this.limit = limit;
    this.stop = false;
    this.nodes = 0;
    let best;
    for (let depth=1; depth<20; depth++) {
      if (depth>1) { moves.push(this.sort(moves[moves.length-1], evals[evals.length-1], (pos.player==1)?true:false)); }
      evals.push([]);
      let alpha = -Infinity;
      let beta = Infinity;
      for (let mv of moves[moves.length-1]) {
        let evl = this.alphaBeta(pos.update(mv),depth-1,alpha,beta);
        evals[evals.length-1].push(evl)
        if (pos.player==1) {
          alpha = Math.max(alpha, evl);
        } else {
          beta = Math.min(beta, evl);
        }
        if (this.stop) { break; }
      }
      if (this.stop) { moves.pop(); evals.pop(); break; }
    }
    best = (pos.player==1)?Math.max(...evals[evals.length-1]):Math.min(...evals[evals.length-1]);
    console.log("Move: " + moves[moves.length-1][evals[evals.length-1].indexOf(best)])
    console.log("Depth searched: " + evals.length);
    console.log("Positions evaluated: " + this.nodes)
    console.log("Time spent: " + (Date.now()-this.start)/1000);
    console.log("Evaluation: " + best);
    return moves[moves.length-1][evals[evals.length-1].indexOf(best)];
  }
  alphaBeta(pos, depth, alpha, beta) {
    if (Date.now()-this.start>this.limit) { this.stop = true; }
    if (this.stop) { return; }
    this.nodes++;
    if (pos.hash in this.transpos) {
      const transposition = this.transpos[pos.hash];
      if (depth<=transposition[1]) { return transposition[0]; }
    }
    if (pos.player*pos.score<-1e5) {
      this.transpos[pos.hash] = [pos.player*(-1e6-depth),depth];
      return pos.player*(-1e6-depth);
    }
    if (this.repeats[pos.hash]>=2) { return 0; }
    if (depth==0) {
      if (pos.mat[0]>=2*pos.mat[1]||2*pos.mat[0]<=pos.mat[1]) {
        const score = pos.endgame();
        this.transpos[pos.hash] = [score,0];
        return score;
      }
      if (pos.player==1) {
        // Assume that there is a noncapture move.
        if (pos.score>alpha) { alpha = pos.score; }
        // If we are doing better than our opponent's best choice, they won't pick this branch.
        if (pos.score>=beta) { this.transpos[pos.hash]=[pos.score,0]; return pos.score; }
      }
      if (pos.player==-1) {
        if (pos.score<beta) { beta = pos.score; }
        if (pos.score<=alpha) { this.transpos[pos.hash]=[pos.score,0]; return pos.score; }
      }
      let captures = pos.captures();
      if (!captures) { this.transpos[pos.hash] = [pos.score,0]; return pos.score; }
      let best = pos.score;
      if (pos.player==1) {
        for (let category of captures) {
          for (let mv of category) {
            let evl = this.alphaBeta(pos.update(mv), 0, alpha, beta)+pos.structure(mv);
            best = Math.max(best, evl);
            alpha = Math.max(alpha, best);
            if (beta<=alpha) { this.transpos[pos.hash]=[best,0]; return best; }
          }
        }
      } else {
        for (let category of captures) {
          for (let mv of category) {
            let evl = this.alphaBeta(pos.update(mv), 0, alpha, beta)+pos.structure(mv);
            best = Math.min(best, evl);
            beta = Math.min(beta, best);
            if (beta<=alpha) { this.transpos[pos.hash]=[best,0]; return best; }
          }
        }
      }
      this.transpos[pos.hash] = [best,0];
      return best;
    }
    let best;
    if (pos.player==1) {
      best = -Infinity;
      for (let mv of pos.moves()) {
        let evl = this.alphaBeta(pos.update(mv), depth-1, alpha, beta)+pos.structure(mv);
        evl = (evl>beta)?evl+depth:evl-depth;
        best = Math.max(best, evl);
        alpha = Math.max(alpha, best);
        if (beta<=alpha) { break; }
      }
    } else {
      best = Infinity;
      for (let mv of pos.moves()) {
        let evl = this.alphaBeta(pos.update(mv), depth-1, alpha, beta)+pos.structure(mv);
        evl = (evl<alpha)?evl-depth:evl+depth;
        best = Math.min(best, evl);
        beta = Math.min(beta, best);
        if (beta<=alpha) { break; }
      }
    }
    if (pos.player*best<-1e5) {
      if (pos.legal().length==0&&!pos.check()) { best = 0; }
    }
    this.transpos[pos.hash] = [best,depth];
    return best;
  }
  bookmove(hst, book) {
    if (book.length==0) { return null; }
    let mvhst = [];
    for (let position of hst.slice(1,hst.length)) {
      mvhst.push(position.prev);
    }
    let possibilities = [];
    let impossibilities = [];
    for (let i=0; i<book.length; i++) {
      if (book[i].length<=mvhst.length) { continue; }
      let match = true;
      for (let j=0; j<mvhst.length; j++) {
        if (mvhst[j][0]!=book[i][j][0]||mvhst[j][1]!=book[i][j][1]) {
          match = false;
          break;
        }
      }
      if (match) {
        possibilities.push(book[i][mvhst.length]);
      } else {
        impossibilities.push(i);
      }
    }
    if (possibilities.length==0) {
      return null;
    }
    impossibilities.reverse();
    for (let imp of impossibilities) {
      book.splice(imp,1);
    }
    console.log("Book games: " + possibilities.length);
    return [possibilities[Math.floor(Math.random()*possibilities.length)],book];
  }
  sort(list, key, descending=true) {
    let clist = [];
    const ckey = [...new Set(key)].sort();
    if (descending) { ckey.reverse() }
    for (let val of ckey) {
      for (let i=0; i<key.length; i++) {
        if (key[i]==val) { clist.push(list[i])}
      }
    }
    return clist;
  }
}

// ----------------------------------------
// -------------- Play Game ---------------
// ----------------------------------------

// To check whether openings book applies.
const startboard = [-99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
                    -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
                    -99, -5, -2, -3, -9, -8, -3, -2, -5,-99,
                    -99, -1, -1, -1, -1, -1, -1, -1, -1,-99,
                    -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
                    -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
                    -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
                    -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
                    -99,  1,  1,  1,  1,  1,  1,  1,  1,-99,
                    -99,  5,  2,  3,  9,  8,  3,  2,  5,-99,
                    -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
                    -99,-99,-99,-99,-99,-99,-99,-99,-99,-99];
let starthash = 0;
for (let i=21; i<99; i++) {
  if (i%10==0||i%10==9||startboard[i]==0) { continue; }
  starthash += zobrist[i][[10,11,12,14,17,18,8,7,6,4,1,0].indexOf(9+startboard[i])];
}

class Game {
  constructor(player, time, starting, book) {
    this.player = player;
    this.time = time;
    this.current = starting;
    this.history = [starting];
    this.book = (this.current.hash==starthash)?book:[];
  }
  async play() {
    const engine = new Engine;
    if (this.player==-1) {
      let computermove;
      const bookmove = engine.bookmove(this.history, this.book);
      if (!bookmove) {
        this.book = [];
        computermove = engine.move(this.history, this.time);
      } else {
        computermove = bookmove[0];
        this.book = bookmove[1];
      }
      this.current = this.current.update(computermove);
      this.history.push(this.current);
    }
    print(this.current.brd, this.player);
    let running = true;
    while (running) {
      if (this.current.legal().length==0) {
        if (this.current.check()) {
          document.getElementById("message").innerHTML = "Computer Wins!";
          running = false;
          continue;
        } else {
          document.getElementById("message").innerHTML = "Stalemate!";
          running = false;
          continue;
        }
      }
      for (let position of this.history) {
        if (this.history.reduce((p,c)=>(c.hash==position.hash)?p+1:p,0)>3) {
          document.getElementById("message").innerHTML = "Draw by Repetition!";
          running = false;
          continue;
        }
      }
      let playermove = await this.playermove();
      while (playermove == "undo") {
        if (this.history.length >=3) {
          this.history.pop();
          this.history.pop();
          this.current = this.history[this.history.length-1];
          print(this.current.brd, this.player)
        }
        playermove = await this.playermove();
      }
      this.current = this.current.update(playermove);
      this.history.push(this.current);
      print(this.current.brd, this.player);
      if (this.current.legal().length==0) {
        if (this.current.check()) {
          document.getElementById("message").innerHTML = "Player Wins!";
          running = false;
          continue;
        } else {
          document.getElementById("message").innerHTML = "Stalemate!";
          running = false;
          continue;
        }
      }
      for (let position of this.history) {
        if (this.history.reduce((p,c)=>(c.hash==position.hash)?p+1:p,0)>3) {
          document.getElementById("message").innerHTML = "Draw by Repetition!";
          running = false;
          continue;
        }
      }
      let computermove;
      const bookmove = engine.bookmove(this.history, this.book);
      if (bookmove===null) {
        this.book = [];
        computermove = engine.move(this.history, this.time);
      } else {
        computermove = bookmove[0];
        this.book = bookmove[1];
      }
      this.current = this.current.update(computermove);
      this.history.push(this.current);
      print(this.current.brd, this.player);
    }
  }
  async playermove() {
    let illegal = true;
    let move;
    while (illegal) {
      move = [null, null];
      while (move[0] === null) {
        move[0] = await select();
      }
      if (move[0] == "undo") {
        return "undo";
      }
      while (move[1] === null) {
        move[1] = await select();
      }
      if (move[1] == "undo") {
        return "undo";
      }
      move[0] = parseInt(move[0].replace("square", ""));
      move[1] = parseInt(move[1].replace("square", ""));
      if (this.player==-1) {
        move = [119-move[0], 119-move[1]]
      }
      for (let mv of this.current.legal()) {
        illegal = false;
        if (mv[0] != move[0]) {
          illegal = true;
        }
        if (mv[1] != move[1]) {
          illegal = true;
        }
        if (!illegal) {
          break;
        }
      }
    }
    return move;
  }
}

// Starting chessboard;
let tempboard = [
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99,  0,  0,  0,  0,  0,  0, -8, -5,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  8,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99
];
/*
tempboard = [
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99,  -5,  -2,   0,   0,  -8,   0,  -2,  -5, -99,
  -99,   0,  -1,   0,   0,  -1,   0,   0,   0, -99,
  -99,   0,   0,  -1,   0,  -1,   0,   0,  -1, -99,
  -99,  -1,   0,   2,   0,   0,   0,   0,   0, -99,
  -99,   0,   0,   0,   0,   0,   3,  -1,   2, -99,
  -99,   1,   0,   0,   0,   0,   0,   0,   0, -99,
  -99,   0,  -9,   1,   0,   0,   1,   1,   1, -99,
  -99,   5,   0,   0,   9,   0,   5,   8,   0, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99
];
tempboard = [
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99,  -5,   0,   0,   0,  -8,  -3,   0,  -5, -99,
  -99,   0,   0,   0,   0,   0,  -1,  -1,   0, -99,
  -99,  -2,   0,   0,  -1,   0,   0,   0,  -1, -99,
  -99,  -1,   0,   0,   2,  -1,   0,   0,   0, -99,
  -99,   0,   0,   0,   0,  -2,   0,   0,   0, -99,
  -99,   0,   1,   0,   0,   0,   2,   0,   0, -99,
  -99,   0,   1,   1,   0,   0,   1,   1,   1, -99,
  -99,   5,   0,   3,   5,   0,   0,   8,   0, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99,
  -99, -99, -99, -99, -99, -99, -99, -99, -99, -99
]
*/
tempboard = [-99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
             -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
             -99,0,0,0,0,0,0,-8,0,-99,
             -99,0,0,-1,0,0,0,0,0,-99,
             -99,0,-1,0,-1,0,0,0,-1,-99,
             -99,0,0,0,8,-1,0,-1,2,-99,
             -99,-1,-2,1,0,0,0,0,0,-99,
             -99,0,0,0,0,1,0,0,0,-99,
             -99,0,1,1,0,5,0,0,1,-99,
             -99,0,0,0,0,0,-5,0,0,-99,
             -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
             -99,-99,-99,-99,-99,-99,-99,-99,-99,-99];
let chessboard = [
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99, -5, -2, -3, -9, -8, -3, -2, -5,-99,
  -99, -1, -1, -1, -1, -1, -1, -1, -1,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  0,  0,  0,  0,  0,  0,  0,  0,-99,
  -99,  1,  1,  1,  1,  1,  1,  1,  1,-99,
  -99,  5,  2,  3,  9,  8,  3,  2,  5,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99,
  -99,-99,-99,-99,-99,-99,-99,-99,-99,-99
];
// chessboard = tempboard;

// Calculate/guess the starting conditions
function conditions(brd) {
  let castle = [[true,true],[true,true]]
  let mat = [0,0];
  let score = 0;
  let hash = 0;
  if (brd[95]!=8||brd[91]!=5) { castle[0][0]=false; }
  if (brd[95]!=8||brd[98]!=5) { castle[0][1]=false; }
  if (brd[25]!=-8||brd[21]!=-5) { castle[1][0]=false; }
  if (brd[25]!=-8||brd[28]!=-5) { castle[1][1]=false; }
  for (let i=21; i<99; i++) {
    let p = brd[i];
    if (p==0||p<-10) { continue; }
    p = (p<0)?-p:p;
    if (p!=8) { mat[(1-brd[i]/p)/2] += values[p]; }
  }
  for (let i=21; i<99; i++) {
    let p = brd[i];
    if (p==0||p<-10) { continue; }
    let sign = (0<p)?1:-1;
    p *= sign;
    score += sign*values[p];
    if (mat[(1+sign)/2]<threshold&&p==8) {
      score -= sign*positional[sign*8][i];
    } else {
      score += sign*positional[sign*p][i];
    }
    hash += zobrist[i][[1,2,3,5,8,9].indexOf(p)+3-3*sign];
  }
  return [score, castle, mat, hash]
}

// Starting position
let start = conditions(chessboard);
let current = new Position(chessboard,1,start[0],start[1],0,start[2],start[3],null);

const chess = new Game(1, 1000, current, bigbook);

chess.play();

import {vec3, vec4} from 'gl-matrix';

export class Particle {

    pos : vec3;
    vel : vec3;
    acc : vec3;
    currTime : number;
    col : vec4;

    constructor(pos: vec3, vel : vec3, acc : vec3, col : vec4, currTime : number) {
        this.pos = pos;
        this.vel = vel;
        this.acc = acc;
        this.col = col;
        this.currTime = currTime;
    }

    update(newTime : number) {
        let deltaTime : number = newTime - this.currTime;
        this.currTime = newTime;


        let tempVel : vec3 = vec3.clone(this.vel);
        let tempAcc : vec3 = vec3.clone(this.acc);

        vec3.add(this.pos, this.pos, (vec3.scale(tempVel, tempVel, deltaTime)));
        vec3.add(this.vel, this.vel, (vec3.scale(tempAcc, tempAcc, deltaTime)));

        //this.col[0] = this.col[0] * (vec3.length(this.pos)* (9000000000000000000000));
        this.col[0] = vec3.length(this.pos) / 150;
        vec4.normalize(this.col, this.col);

    }

    changeAcc(newAcc : vec3) {
        this.acc = newAcc;
    }

    changeVel(newVel : vec3) {
        this.vel = newVel;
    }

    changePos(newPos : vec3) {
        this.pos = newPos;
    }
}

export default Particle;
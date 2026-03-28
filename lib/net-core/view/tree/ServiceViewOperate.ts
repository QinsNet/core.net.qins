import { TreeOperateView, ViewTreeAssign } from "./OperateView";

export class ServiceViewOperate extends TreeOperateView {
    constructor(view: string){
        super(view);
    }
    apply(src: Record<string, unknown>, dst: Record<string, unknown>): void {
        ViewTreeAssign(src, dst, this.tree);
    }
}
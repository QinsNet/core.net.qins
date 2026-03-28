import { ISQLSource } from "../../component/SQLSource";
import { NodeProperties } from "../../config";
import { TreeOperateView, ViewTreeAssign } from "./OperateView";

export class SQLViewOperate extends TreeOperateView {
    sql: string;
    constructor(view: string, sql: string){
        super(view);
        this.sql = sql;
    }
    input(src: ISQLSource, dst: Record<string, unknown>, config: NodeProperties): void {
        src.exec(this.sql).then(result => {
            //先解析result为json
            const sqlJSON = JSON.parse(result as string);
            //再将jsonResult赋值给dst
            const types = this.getTypes(config);

        });
    }
}
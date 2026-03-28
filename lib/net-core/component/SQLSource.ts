export interface ISQLSource {
    name: string;
    jdbc: string;
    username: string;
    password: string;
    driver: string;
    exec(sql: string): Promise<unknown>;
}

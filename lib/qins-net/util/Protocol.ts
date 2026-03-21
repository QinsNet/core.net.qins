import { RequestPact, ResponsePact } from "../config/Action";
import { ParameterProperties } from "../config/Parameter";
import { PathRequestProtocol, PathResponseProtocol } from "../node/path/Protocol";
import { ResponseProtocol,RequestProtocol, ExceptionProtocol } from "../protocol/Protocol";

export class ProtocolBuilder{
  static buildException(request: RequestProtocol,exception: ExceptionProtocol): ResponseProtocol {
    return {
      result: {
        type: 'Exception'
      },
      ...request,
      exception: exception,
    };
  }
  static buildPathRequest(request: RequestProtocol,path: RequestPact): PathRequestProtocol {
    return new PathRequestProtocol(request.node,request.method,request.actor,request.parameters,path);
  }
  static buildPathResponse(response: ResponseProtocol,path: ResponsePact): PathResponseProtocol {
    return new PathResponseProtocol(response.node,response.actor,response.parameters,response.result,path);  
  }
}
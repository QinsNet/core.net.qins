import { RequestPact, ResponsePact } from "../decorators/Method";
import { PathRequestProtocol, PathResponseProtocol } from "../endpoint/path/PathProtocol";
import { ResponseProtocol,RequestProtocol, ExceptionProtocol } from "../protocol/Protocol";

export class ProtocolBuilder{
  static buildException(request: RequestProtocol,exception: ExceptionProtocol): ResponseProtocol {
    return {
      result: {
        type: 'Exception'
      },
      ...request,
      ...exception,
    };
  }
  static buildPathRequest(request: RequestProtocol,path: RequestPact): PathRequestProtocol {
    return new PathRequestProtocol(request.endpoint,request.method,request.actor,request.parameters,path);
  }
  static buildPathResponse(response: ResponseProtocol,path: ResponsePact): PathResponseProtocol {
    return new PathResponseProtocol(response.endpoint,response.actor,response.parameters,response.result,path);
  }
}
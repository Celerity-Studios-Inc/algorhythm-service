"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let LoggingInterceptor = class LoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        request.requestId = requestId;
        response.setHeader('X-Request-ID', requestId);
        this.logger.log(`➡️  ${method} ${url} - ${ip} - ${userAgent.substring(0, 100)} [${requestId}]`);
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                const responseTime = Date.now() - startTime;
                const { statusCode } = response;
                this.logger.log(`⬅️  ${method} ${url} - ${statusCode} - ${responseTime}ms [${requestId}]`);
            },
            error: (error) => {
                const responseTime = Date.now() - startTime;
                const statusCode = error.status || 500;
                this.logger.error(`❌ ${method} ${url} - ${statusCode} - ${responseTime}ms - ${error.message} [${requestId}]`);
            }
        }));
    }
    generateRequestId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map
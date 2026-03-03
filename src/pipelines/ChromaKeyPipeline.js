export default class ChromaKeyPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            renderTarget: true,
            fragShader: `
            precision mediump float;
            uniform sampler2D uMainSampler;
            varying vec2 outTexCoord;

            void main() {
                vec4 color = texture2D(uMainSampler, outTexCoord);
                
                // 크로마키 설정: 흰색(#FFFFFF)과의 거리 계산
                vec3 targetColor = vec3(1.0, 1.0, 1.0);
                float dist = distance(color.rgb, targetColor);
                
                // 거리가 0.15 미만이면 배경으로 간주하고 제거 (픽셀 아트의 외곽선 보존을 위해 더 정교하게 조정)
                if (dist < 0.15) {
                    discard;
                }
                
                gl_FragColor = color;
            }
            `
        });
    }
}

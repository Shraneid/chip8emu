@group(0) @binding(0) var texture: texture_2d<u32>;

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
};


@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
    let white = vec3(255 / 255.0, 204.0 / 256.0, 0.0 / 256.0);
    let black = vec3(153.0 / 255.0, 102 / 255.0, 0.0 / 255.0);

    let dims = textureDimensions(texture);
    let texel = vec2<u32>(in.uv * vec2<f32>(dims));
    let c = f32(textureLoad(texture, vec2(texel.x, dims.y - texel.y), 0).r);

    return vec4(c * white + black * (1.0-c), 1.0);
}
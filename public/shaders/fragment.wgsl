@group(0) @binding(0) var texture: texture_2d<u32>;

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
};


@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
    let dims = textureDimensions(texture);
    let texel = vec2<u32>(in.uv * vec2<f32>(dims));
    let c = f32(textureLoad(texture, vec2(texel.x, dims.y - texel.y), 0).r);

    return vec4(c, 0.0, 0.0, 1.0);
}
extends SceneTree

var viewport := SubViewport.new()
var camera := Camera3D.new()
var billboard := MeshInstance3D.new()
var material := StandardMaterial3D.new()
var environment := Environment.new()
var failures := 0

func _initialize() -> void:
    call_deferred("run")

func check(ok: bool, message: String) -> void:
    if not ok:
        failures += 1
        push_error(message)

func run() -> void:
    root.add_child(viewport)
    viewport.own_world_3d = true
    viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
    var lighting := WorldEnvironment.new()
    lighting.environment = environment
    environment.background_mode = Environment.BG_COLOR
    viewport.add_child(lighting)
    viewport.add_child(camera)
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    viewport.add_child(billboard)
    billboard.mesh = QuadMesh.new()
    billboard.material_override = material
    material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
    for id in ["candle", "tires", "barrel"]:
        await exercise(id)
    quit(1 if failures else 0)

func exercise(id: String) -> void:
    var model := load("res://" + id + ".glb") as PackedScene
    check(model != null, id + " GLB import")
    if model:
        var prop := model.instantiate()
        check(not prop.find_children("*", "MeshInstance3D", true, false).is_empty(), id + " GLB mesh")
        prop.free()
    var atlas := load("res://" + id + ".png") as Texture2D
    var f: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://" + id + ".json"))
    var raw := Image.new()
    var decode := raw.load_png_from_buffer(FileAccess.get_file_as_bytes("res://" + id + ".png"))
    if not atlas or decode != OK:
        check(false, id + " texture import")
        return
    var size := int(f.frameWidth)
    viewport.size = Vector2i(size, size)
    var frame: int
    var seconds := 0.4
    if f.has("frameTimes"):
        frame = f.frameTimes.bsearch(seconds, false) - 1
        check(frame != int(seconds * f.frameRate), id + " explicit frameTimes sampling")
    else:
        frame = int(seconds * f.frameRate)
    var cell := Vector2i(frame % int(f.columns), floori(float(frame) / float(f.columns)))
    var plane: Dictionary = f.plane
    var side := float(plane.widthMeters)
    var pivot := Vector2(plane.pivotUV[0], plane.pivotUV[1])
    billboard.mesh.size = Vector2(side, plane.heightMeters)
    billboard.position = Vector3((0.5 - pivot.x) * side, (pivot.y - 0.5) * plane.heightMeters, 0)
    camera.position = Vector3(plane.center[0], plane.center[1], side + 1)
    camera.size = side
    material.albedo_texture = atlas
    material.uv1_scale = Vector3(1.0 / f.columns, 1.0 / f.rows, 1)
    material.uv1_offset = Vector3(float(cell.x) / f.columns, float(cell.y) / f.rows, 0)
    var ink := 0
    var max_error := 0.0
    for bg in [Color.BLACK, Color.WHITE]:
        environment.background_color = bg
        await process_frame
        await RenderingServer.frame_post_draw
        var rendered := viewport.get_texture().get_image()
        if not rendered or rendered.get_size() != viewport.size:
            check(false, id + " GPU readback")
            return
        rendered.save_png("res://" + id + ("-black.png" if bg == Color.BLACK else "-white.png"))
        for y in range(size):
            for x in range(size):
                var source := raw.get_pixel(cell.x * size + x, cell.y * size + y)
                if source.a > 0.02 and source.a < 0.98:
                    ink += 1
                var expected: Color = bg.blend(source)
                var actual := rendered.get_pixel(x, y)
                max_error = maxf(max_error, maxf(absf(expected.r - actual.r), maxf(absf(expected.g - actual.g), absf(expected.b - actual.b))))
    check(ink > 0, id + " visible translucent samples")
    check(max_error < 4.0 / 255.0, id + " straight-alpha blend or orientation, max error " + str(max_error))
    print("%s frame=%d size=%d maxRGBerror=%.5f" % [id, frame, size, max_error])

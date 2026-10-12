import plotly.express as px

COR = "#1f6feb"


def barras_diarias(df, x, y, titulo, rotulo_y):
    fig = px.bar(df, x=x, y=y, title=titulo, labels={x: "", y: rotulo_y})
    fig.update_traces(marker_color=COR)
    fig.update_layout(margin=dict(t=50, b=10, l=10, r=10), height=340)
    return fig


def barras_horizontais(df, x, y, titulo, rotulo_x):
    fig = px.bar(df, x=x, y=y, orientation="h", title=titulo, labels={x: rotulo_x, y: ""})
    fig.update_traces(marker_color=COR)
    fig.update_layout(
        margin=dict(t=50, b=10, l=10, r=10),
        height=max(220, 60 + 42 * len(df)),
        yaxis=dict(autorange="reversed"),
    )
    return fig


def rosca(df, nomes, valores, titulo):
    fig = px.pie(df, names=nomes, values=valores, title=titulo, hole=0.45)
    fig.update_layout(margin=dict(t=50, b=10, l=10, r=10), height=340)
    return fig

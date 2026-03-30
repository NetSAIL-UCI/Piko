import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def analyze_trace(trace_path):
    # need to put in aggregates
    trace = pd.read_csv(trace_path)
    return trace


def analyze_aggregates(data):
    # need to put in aggregates
    aggregates = data.groupby('since').agg({
        'bandwidth_kbps': 'mean',
        'rtt': 'mean',
    })
    return aggregates

def main():
    data = []
    directory_path = input("Enter the directory path: ")
    traces = [f for f in os.listdir(directory_path) if f.endswith('.csv')]
    for trace in traces:
        trace_path = os.path.join(directory_path, trace)
        trace = analyze_trace(trace_path)
        data.append(trace)
    data = pd.concat(data, ignore_index=True)
if __name__ == "__main__":
    main()
import API, { getErrorMessage } from "./client";
import type { Cell, Fellowship } from "../types";
import { toList } from "./utils";

interface CreateFellowshipPayload {
  name: string;
  leader?: number | null;
}

interface CreateCellPayload {
  name: string;
  fellowship: number;
  leader?: number | null;
  meeting_day: string;
  meeting_time: string;
  venue: string;
}

export const getFellowships = async (): Promise<Fellowship[]> => {
  try {
    const response = await API.get<Fellowship[] | { results: Fellowship[] }>("structure/fellowships/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch fellowships."));
  }
};

export const createFellowship = async (payload: CreateFellowshipPayload): Promise<Fellowship> => {
  try {
    const response = await API.post<Fellowship>("structure/fellowships/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create fellowship."));
  }
};

export const getCells = async (): Promise<Cell[]> => {
  try {
    const response = await API.get<Cell[] | { results: Cell[] }>("structure/cells/");
    return toList(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch cells."));
  }
};

export const createCell = async (payload: CreateCellPayload): Promise<Cell> => {
  try {
    const response = await API.post<Cell>("structure/cells/", payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create cell."));
  }
};

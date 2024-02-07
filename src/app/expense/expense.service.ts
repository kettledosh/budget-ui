
import {Injectable} from "@angular/core";
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {ExpenseUpsertDto, ExpenseCriteria, Expense, Page} from "../shared/domain";

@Injectable({ providedIn: 'root' })
export class ExpenseService {
    private readonly apiURL = `${environment.backendUrl}/expenses`;
    //private readonly apiV2Url = `${environment.backendUrl}/v2/expenses`;

    constructor(private readonly httpClient: HttpClient) {}

    //Suche nach
    getExpenses = (pagingCriteria: ExpenseCriteria): Observable<Page<Expense>> =>
        this.httpClient.get<Page<Expense>>(this.apiURL, {params: new HttpParams({ fromObject: { ...pagingCriteria } }) });

    //Ausgaben erstellen / updaten
    upsertExpense = (expenseUpsertDto: ExpenseUpsertDto): Observable<void> => this.httpClient.put<void>(this.apiURL, expenseUpsertDto);

    //Ausgaben löschen
    deleteExpense = (id: string): Observable<void> => this.httpClient.delete<void>(`${this.apiURL}/${id}`);

}
